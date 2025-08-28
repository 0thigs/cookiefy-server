import type { FastifyInstance } from 'fastify';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import { updateProfileSchema } from '../../validators/users.schemas.js';

export async function usersRoutes(app: FastifyInstance) {
  const usersRepo = new PrismaUsersRepository();

  app.get('/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const user = await usersRepo.findById(userId);
    if (!user) return reply.notFound('Usuário não encontrado');
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const user = await usersRepo.findById(userId);
    if (!user) return reply.notFound('Usuário não encontrado');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl ?? null,
      createdAt: user.createdAt,
    };
  });

  app.patch('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const body = updateProfileSchema.parse(req.body);
    const updated = await usersRepo.update(userId, {
      name: body.name,
      photoUrl: body.photoUrl ?? null,
    });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      photoUrl: updated.photoUrl ?? null,
      createdAt: updated.createdAt,
    };
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await usersRepo.getPublicProfile(id);
    if (!data) return reply.notFound('Usuário não encontrado');
    return data;
  });
}
