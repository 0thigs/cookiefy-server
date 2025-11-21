import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaRecipesRepository } from '../../../infrastructure/repositories/prisma-recipes-repository.js';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import { paginationQuerySchema, paginatedRecipesOut } from '../../validators/recipes.schemas.js';

const adminListSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).default(20),
  q: z.string().optional()
});

export async function adminRoutes(app: FastifyInstance) {
  const recipesRepo = new PrismaRecipesRepository();
  const usersRepo = new PrismaUsersRepository();

  app.addHook('preHandler', async (req, reply) => {
    await app.authenticate(req, reply);
    const userId = (req.user as any).sub;
    const user = await usersRepo.findById(userId);
    if (user?.role !== 'ADMIN') {
      return reply.code(403).send({ message: 'Acesso restrito a administradores' });
    }
  });

  app.get('/recipes', {
    schema: {
      tags: ['Admin'],
      querystring: adminListSchema,
      response: { 200: paginatedRecipesOut }
    }
  }, async (req) => {
    const { page, pageSize, q } = adminListSchema.parse(req.query);
    const result = await recipesRepo.listAllForAdmin({ page, pageSize }, q);
    
    return {
      data: result.items.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        isFavorited: false
      })),
      meta: { page: result.page, pageSize: result.pageSize, total: result.total }
    };
  });

  app.get('/recipes/pending', {
    schema: {
      tags: ['Admin'],
      querystring: paginationQuerySchema,
      response: { 200: paginatedRecipesOut }
    }
  }, async (req) => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    const result = await recipesRepo.listAllPending({ page, pageSize });
    
    return {
      data: result.items.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        isFavorited: false
      })),
      meta: { page: result.page, pageSize: result.pageSize, total: result.total }
    };
  });

  app.patch('/recipes/:id/moderate', {
    schema: {
      tags: ['Admin'],
      params: z.object({ id: z.string() }),
      body: z.object({
        status: z.enum(['PUBLISHED', 'REJECTED']),
        reason: z.string().optional()
      }),
      response: { 204: z.null() }
    }
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, reason } = req.body as { status: 'PUBLISHED' | 'REJECTED', reason?: string };
    const moderatorId = (req.user as any).sub;

    await recipesRepo.moderateRecipe(id, status, reason, moderatorId);
    return reply.status(204).send();
  });
}
