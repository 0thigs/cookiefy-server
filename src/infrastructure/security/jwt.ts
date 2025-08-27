import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';

export function registerJWT(app: FastifyInstance) {
  app.register(import('@fastify/jwt'), { secret: env.JWT_SECRET });
  app.decorate('authenticate', async function (request) {
    await request.jwtVerify();
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
  interface FastifyRequest {
    jwt: { user: { sub: string } };
  }
}
