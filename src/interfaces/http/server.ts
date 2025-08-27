import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { registerJWT } from '../../infrastructure/security/jwt.js';
import { authRoutes } from './{routes}/auth.routes.js';
import { usersRoutes } from './{routes}/users.routes.js';
import { recipesRoutes } from './{routes}/recipes.routes.js';

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(sensible);
  registerJWT(app);

  app.register(swagger, {
    openapi: {
      info: { title: 'RecipeFlow API', version: '0.1.0' }
    }
  });
  app.register(swaggerUI, { routePrefix: '/docs' });

  app.register(authRoutes, { prefix: '/auth' });
  app.register(usersRoutes, { prefix: '/users' });
  app.register(recipesRoutes, { prefix: '/recipes' });

  app.setErrorHandler((err, _req, reply) => {
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({ message: err.message ?? 'Internal error' });
  });

  return app;
}
