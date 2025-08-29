import { prisma } from '../../shared/db/prisma.js';
import type { FavoritesRepository } from '../../domain/repositories/favorites-repository.js';
import type { Recipe } from '../../domain/entities/recipe.js';

export class PrismaFavoritesRepository implements FavoritesRepository {
  async add(userId: string, recipeId: string) {
    const exists = await prisma.recipe.findFirst({ where: { id: recipeId, status: 'PUBLISHED' } });
    if (!exists) throw new Error('NOT_FOUND');

    await prisma.favorite.createMany({
      data: [{ userId, recipeId }],
      skipDuplicates: true,
    });
  }

  async remove(userId: string, recipeId: string) {
    await prisma.favorite.deleteMany({ where: { userId, recipeId } });
  }

  async listForUser(userId: string, pagination: { page: number; pageSize: number }) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      prisma.favorite.count({
        where: { userId, recipe: { status: 'PUBLISHED' } },
      }),
      prisma.favorite.findMany({
        where: { userId, recipe: { status: 'PUBLISHED' } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          recipe: {
            select: {
              id: true,
              title: true,
              description: true,
              authorId: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const items: Recipe[] = rows.map((r) => ({
      id: r.recipe.id,
      title: r.recipe.title,
      description: r.recipe.description ?? null,
      authorId: r.recipe.authorId,
      createdAt: r.recipe.createdAt,
    }));

    return { items, total, page, pageSize };
  }
}
