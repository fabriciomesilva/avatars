import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config/env';
import { healthRoutes } from './routes/health';
import { framesRoutes } from './routes/frames';
import { frameProxyRoutes } from './routes/frame-proxy';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  // ---- CORS ----
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Permitir requests sem origin (ferramentas, server-to-server)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Se ALLOWED_EMBED_ORIGINS contém '*', permitir tudo
      if (config.allowedEmbedOrigins.includes('*')) {
        cb(null, true);
        return;
      }

      // Verificar se a origin está na lista de permitidos
      if (config.allowedEmbedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }

      // Em desenvolvimento, permitir localhost
      if (config.nodeEnv === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        cb(null, true);
        return;
      }

      cb(new Error('CORS não permitido para esta origem'), false);
    },
    credentials: true,
  });

  // ---- Rate Limiting ----
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ---- Segurança: CSP frame-ancestors ----
  app.addHook('onSend', async (request, reply) => {
    const frameAncestors = config.allowedEmbedOrigins.includes('*')
      ? "'self' *"
      : `'self' ${config.allowedEmbedOrigins.join(' ')}`;

    reply.header('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'ALLOWALL'); // CSP frame-ancestors tem prioridade
  });

  // ---- Registrar rotas da API ----
  await app.register(healthRoutes);
  await app.register(framesRoutes);
  await app.register(frameProxyRoutes);

  // ---- Servir arquivos estáticos do frontend ----
  const publicDir = path.resolve(__dirname, '../public');
  try {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
    });

    // SPA fallback: redirecionar todas as rotas não-API para index.html
    app.setNotFoundHandler(async (request, reply) => {
      // Se a rota começa com /api, retornar 404 JSON
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Endpoint não encontrado' });
      }

      // Caso contrário, servir index.html para SPA routing
      return reply.sendFile('index.html', publicDir);
    });
  } catch (err) {
    // Em desenvolvimento, o frontend roda separado (Vite dev server)
    app.log.warn('Diretório público não encontrado — modo desenvolvimento (frontend servido pelo Vite)');

    app.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send({ error: 'Endpoint não encontrado' });
    });
  }

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`🚀 Servidor rodando em http://0.0.0.0:${config.port}`);
    app.log.info(`📦 Ambiente: ${config.nodeEnv}`);
    app.log.info(`🖼️  Manifesto de molduras: ${config.framesManifestUrl || '(não configurado — modo mock)'}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
