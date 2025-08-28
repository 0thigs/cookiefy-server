import type { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { env } from '../../config/env.js';

export function registerJWT(app: FastifyInstance) {
  // Registra plugin com um único segredo
  app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  // Guard para rotas protegidas
  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.unauthorized();
    }
  });

  // Helpers para gerar access e refresh
  app.decorate('signAccess', (payload: { sub: string }) =>
    app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL }),
  );

  app.decorate('signRefresh', (payload: { sub: string }) =>
    app.jwt.sign(payload, { expiresIn: env.JWT_REFRESH_TTL }),
  );
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
    signAccess: (payload: { sub: string }) => string;
    signRefresh: (payload: { sub: string }) => string;
  }
}
