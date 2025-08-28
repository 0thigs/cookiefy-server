import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { registerJWT } from '../../infrastructure/security/jwt.js';
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { recipesRoutes } from './routes/recipes.routes.js';
import { env, BODY_LIMIT_BYTES, CORS_ORIGINS, IS_PROD } from '../../config/env.js';
import { prisma } from '../../shared/db/prisma.js';

// Zod → JSON Schema + compilers
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true,
    bodyLimit: BODY_LIMIT_BYTES,
  }).withTypeProvider<ZodTypeProvider>();

  // Compiladores Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Segurança, utilitários e CORS
  app.register(helmet);
  app.register(sensible);
  app.register(cookie, {
    // opcional: assinar cookies
    // secret: env.COOKIE_SECRET
  });
  app.register(cors, {
    origin: CORS_ORIGINS,
    credentials: true,
  });
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    ban: 0,
  });

  // JWT
  registerJWT(app);

  // OpenAPI/Swagger com transformação Zod
  app.register(swagger, {
    openapi: {
      info: { title: 'RecipeFlow API', version: '0.1.0' },
    },
    transform: jsonSchemaTransform,
  });

  app.get('/', async () => ({ name: 'RecipeFlow API', status: 'ok', docs: '/docs' }));
  app.register(swaggerUI, { routePrefix: '/docs' });

  // Health/Readiness
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    env: env.NODE_ENV,
  }));

  app.get('/ready', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch (e) {
      return reply.serviceUnavailable('database not ready');
    }
  });

  // Rotas de negócio
  app.register(authRoutes, { prefix: '/auth' });
  app.register(usersRoutes, { prefix: '/users' });
  app.register(recipesRoutes, { prefix: '/recipes' });

  // Handler de erro padrão
  app.setErrorHandler((err, _req, reply) => {
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({
      message: err.message ?? 'Internal error',
    });
  });

  return app;
}
