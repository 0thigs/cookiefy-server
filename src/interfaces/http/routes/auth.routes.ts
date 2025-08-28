import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { signInSchema, signUpSchema } from '../../validators/auth.schemas.js';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import { CreateUser } from '../../../application/users/create-user-use-case.js';
import { compare } from '../../../infrastructure/security/hash.js';
import { IS_PROD } from '../../../config/env.js';

const SignUpResponse = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

const SignInResponse = z.object({
  token: z.string(),
  expiresIn: z.number(),
});

const RefreshResponse = z.object({
  token: z.string(),
  expiresIn: z.number(),
});

export async function authRoutes(app: FastifyInstance) {
  const usersRepo = new PrismaUsersRepository();

  app.post(
    '/signup',
    {
      schema: {
        tags: ['Auth'],
        body: signUpSchema,
        response: { 201: SignUpResponse },
      },
    },
    async (req, reply) => {
      const body = signUpSchema.parse(req.body);
      const useCase = new CreateUser(usersRepo);
      const user = await useCase.execute(body);
      return reply.status(201).send(user);
    },
  );

  app.post(
    '/signin',
    {
      schema: {
        tags: ['Auth'],
        body: signInSchema,
        response: { 200: SignInResponse },
      },
    },
    async (req, reply) => {
      const body = signInSchema.parse(req.body);
      const user = await usersRepo.findByEmail(body.email);

      if (!user || !user.passwordHash) {
        return reply.unauthorized('Credenciais inválidas');
      }
      const ok = await compare(body.password, user.passwordHash);
      if (!ok) return reply.unauthorized('Credenciais inválidas');

      const token = app.jwt.sign({ sub: user.id });
      const refresh = app.refreshJwt.sign({ sub: user.id });

      reply.setCookie('refreshToken', refresh, {
        httpOnly: true,
        sameSite: 'lax',
        secure: IS_PROD,
        path: '/',
      });

      return { token, expiresIn: (app as any).jwt.options.sign.expiresIn ?? 0 };
    },
  );

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        response: { 200: RefreshResponse },
      },
    },
    async (req, reply) => {
      const token = (req.cookies as any)?.refreshToken;
      if (!token) return reply.unauthorized();

      try {
        const payload = app.refreshJwt.verify(token) as { sub: string };
        const newAccess = app.jwt.sign({ sub: payload.sub });
        return { token: newAccess, expiresIn: (app as any).jwt.options.sign.expiresIn ?? 0 };
      } catch {
        return reply.unauthorized();
      }
    },
  );

  app.post(
    '/signout',
    { schema: { tags: ['Auth'], response: { 204: z.null() } } },
    async (_req, reply) => {
      reply.clearCookie('refreshToken', { path: '/' });
      return reply.status(204).send();
    },
  );

  app.get(
    '/me',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Auth'],
        response: { 200: z.object({ userId: z.string() }) },
      },
    },
    async (req) => {
      const payload = req.user as { sub: string };
      return { userId: payload.sub };
    },
  );
}
