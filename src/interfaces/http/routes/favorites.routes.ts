import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaFavoritesRepository } from '../../../infrastructure/repositories/prisma-favorites-repository.js';
import { paginationQuerySchema, paginatedRecipesOut } from '../../validators/recipes.schemas.js';

export async function favoritesRoutes(app: FastifyInstance) {
  const repo = new PrismaFavoritesRepository();

  app.post(
    '/:recipeId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Favorites'],
        params: z.object({ recipeId: z.string().min(1) }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { recipeId } = req.params as { recipeId: string };
      const userId = (req.user as any).sub as string;
      try {
        await repo.add(userId, recipeId);
        return reply.status(204).send();
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return reply.notFound('Receita não encontrada');
        throw e;
      }
    },
  );

  app.delete(
    '/:recipeId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Favorites'],
        params: z.object({ recipeId: z.string().min(1) }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { recipeId } = req.params as { recipeId: string };
      const userId = (req.user as any).sub as string;
      await repo.remove(userId, recipeId);
      return reply.status(204).send();
    },
  );

  app.get(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Favorites'],
        querystring: paginationQuerySchema,
        response: { 200: paginatedRecipesOut },
      },
    },
    async (req) => {
      const userId = (req.user as any).sub as string;
      const { page, pageSize } = paginationQuerySchema.parse(req.query);

      const result = await repo.listForUser(userId, { page, pageSize });
      return {
        data: result.items.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          authorId: r.authorId,
          createdAt: r.createdAt.toISOString(),
        })),
        meta: { page: result.page, pageSize: result.pageSize, total: result.total },
      };
    },
  );
}
