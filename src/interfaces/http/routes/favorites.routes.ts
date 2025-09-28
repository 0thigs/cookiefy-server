import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaFavoritesRepository } from '../../../infrastructure/repositories/prisma-favorites-repository.js';
import { 
  favoriteStatusOut,
  favoritesListQuerySchema,
  paginatedFavoritesOut,
  favoritesStatsOut
} from '../../validators/favorites.schemas.js';

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
        querystring: favoritesListQuerySchema,
        response: { 200: paginatedFavoritesOut },
      },
    },
    async (req) => {
      const userId = (req.user as any).sub as string;
      const filters = favoritesListQuerySchema.parse(req.query);

      // Se não há filtros especiais, usar método simples
      const hasFilters = Object.keys(filters).some(key => 
        key !== 'page' && key !== 'pageSize' && filters[key as keyof typeof filters] !== undefined
      );

      const result = hasFilters 
        ? await repo.listForUserWithFilters(userId, filters)
        : await repo.listForUser(userId, { page: filters.page, pageSize: filters.pageSize });

      return {
        data: result.items.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          authorId: r.authorId,
          author: r.author || {
            id: r.authorId,
            name: 'Autor Desconhecido',
            photoUrl: null,
          },
          createdAt: r.createdAt?.toISOString?.() || r.createdAt,
          favoritedAt: r.favoritedAt?.toISOString?.() || r.createdAt?.toISOString?.() || r.createdAt,
          nutrition: r.nutrition ?? null,
          ingredients: r.ingredients || [],
        })),
        meta: { page: result.page, pageSize: result.pageSize, total: result.total },
      };
    },
  );

  // Verificar se uma receita está favoritada
  app.get(
    '/:recipeId/status',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Favorites'],
        params: z.object({ recipeId: z.string().min(1) }),
        response: { 200: favoriteStatusOut },
      },
    },
    async (req) => {
      const { recipeId } = req.params as { recipeId: string };
      const userId = (req.user as any).sub as string;
      
      const status = await repo.getFavoriteStatus(userId, recipeId);
      return {
        isFavorited: status.isFavorited,
        favoritedAt: status.favoritedAt?.toISOString() || null,
      };
    },
  );

  // Estatísticas de favoritos do usuário
  app.get(
    '/stats',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Favorites'],
        response: { 200: favoritesStatsOut },
      },
    },
    async (req) => {
      const userId = (req.user as any).sub as string;
      const stats = await repo.getStats(userId);
      return stats;
    },
  );
}
