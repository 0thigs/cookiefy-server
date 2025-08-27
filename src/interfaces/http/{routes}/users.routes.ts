import type { FastifyInstance } from 'fastify';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';

export async function usersRoutes(app: FastifyInstance) {
  const usersRepo = new PrismaUsersRepository();

  app.get('/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const user = await usersRepo.findById(userId);
    if (!user) return reply.notFound('Usuário não encontrado');
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  });
}
