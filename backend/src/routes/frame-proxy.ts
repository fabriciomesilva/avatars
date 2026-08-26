import { FastifyInstance, FastifyRequest } from 'fastify';
import { fetchManifest, fetchFrameImage } from '../services/frameCache';

interface FrameParams {
  id: string;
}

export async function frameProxyRoutes(app: FastifyInstance) {
  /**
   * GET /api/frames/:id/image
   * Serve o PNG da moldura via proxy/cache
   */
  app.get<{ Params: FrameParams }>(
    '/api/frames/:id/image',
    async (request: FastifyRequest<{ Params: FrameParams }>, reply) => {
      const { id } = request.params;

      // Sanitizar ID — rejeitar se contiver caracteres suspeitos
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return reply.status(400).send({ error: 'ID de moldura inválido' });
      }

      // Buscar manifesto para encontrar o filename real
      const manifest = await fetchManifest();
      if (!manifest) {
        return reply.status(502).send({ error: 'Manifesto indisponível' });
      }

      const frame = manifest.frames.find((f) => f.id === id);
      if (!frame) {
        return reply.status(404).send({ error: 'Moldura não encontrada' });
      }

      const result = await fetchFrameImage(id, frame.file, 'image');
      if (!result) {
        return reply.status(502).send({ error: 'Não foi possível carregar a imagem da moldura' });
      }

      return reply
        .header('Content-Type', result.contentType)
        .header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
        .header('X-Content-Type-Options', 'nosniff')
        .send(result.buffer);
    }
  );

  /**
   * GET /api/frames/:id/thumbnail
   * Serve a miniatura da moldura via proxy/cache
   */
  app.get<{ Params: FrameParams }>(
    '/api/frames/:id/thumbnail',
    async (request: FastifyRequest<{ Params: FrameParams }>, reply) => {
      const { id } = request.params;

      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return reply.status(400).send({ error: 'ID de moldura inválido' });
      }

      const manifest = await fetchManifest();
      if (!manifest) {
        return reply.status(502).send({ error: 'Manifesto indisponível' });
      }

      const frame = manifest.frames.find((f) => f.id === id);
      if (!frame) {
        return reply.status(404).send({ error: 'Moldura não encontrada' });
      }

      // Usar thumbnail se disponível, senão usar a imagem principal
      const fileName = frame.thumbnail || frame.file;
      const result = await fetchFrameImage(id, fileName, 'thumbnail');
      if (!result) {
        return reply.status(502).send({ error: 'Não foi possível carregar a thumbnail' });
      }

      return reply
        .header('Content-Type', result.contentType)
        .header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
        .header('X-Content-Type-Options', 'nosniff')
        .send(result.buffer);
    }
  );
}
