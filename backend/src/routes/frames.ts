import { FastifyInstance } from 'fastify';
import { fetchManifest } from '../services/frameCache';

export async function framesRoutes(app: FastifyInstance) {
  /**
   * GET /api/frames
   * Retorna manifesto normalizado com URLs internas (nunca expõe URLs privadas)
   */
  app.get('/api/frames', async (_request, reply) => {
    const manifest = await fetchManifest();

    if (!manifest) {
      return reply.status(502).send({
        error: 'Não foi possível carregar o manifesto de molduras',
      });
    }

    // Normalizar: substituir file/thumbnail por URLs internas
    const normalizedFrames = manifest.frames.map((frame) => ({
      id: frame.id,
      label: frame.label,
      shape: frame.shape,
      image: `/api/frames/${encodeURIComponent(frame.id)}/image`,
      thumbnail: `/api/frames/${encodeURIComponent(frame.id)}/thumbnail`,
    }));

    return reply.status(200).send({ frames: normalizedFrames });
  });
}
