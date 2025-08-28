import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';

export function registerJWT(app: FastifyInstance) {
  app.register(import('@fastify/jwt'), {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.register(import('@fastify/jwt'), {
    secret: env.JWT_REFRESH_SECRET,
    sign: { expiresIn: env.JWT_REFRESH_TTL },
    namespace: 'refresh',
  });

  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.unauthorized();
    }
  });
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    refreshJwt: any;
  }
}
