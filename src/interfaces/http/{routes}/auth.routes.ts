import type { FastifyInstance } from 'fastify';
import { signInSchema, signUpSchema } from '../../validators/auth.schemas.js';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import { CreateUser } from '../../../application/users/create-user-use-case.js';
import { compare } from '../../../infrastructure/security/hash.js';

export async function authRoutes(app: FastifyInstance) {
  const usersRepo = new PrismaUsersRepository();

  app.post('/signup', async (req, reply) => {
    const body = signUpSchema.parse(req.body);
    const useCase = new CreateUser(usersRepo);
    const user = await useCase.execute(body);
    return reply.status(201).send(user);
  });

  app.post('/signin', async (req, reply) => {
    const body = signInSchema.parse(req.body);
    const user = await usersRepo.findByEmail(body.email);

    if (!user || !user.passwordHash) {
      return reply.unauthorized('Credenciais inválidas');
    }
    const ok = await compare(body.password, user.passwordHash);
    if (!ok) return reply.unauthorized('Credenciais inválidas');

    const token = app.jwt.sign({ sub: user.id });
    return { token };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const payload = (req.user as any);
    return { userId: payload.sub };
  });
}
