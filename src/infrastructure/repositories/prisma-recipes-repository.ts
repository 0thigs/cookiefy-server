import { prisma } from '../../shared/db/prisma.js';
import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';

export class PrismaRecipesRepository implements RecipesRepository {
  async create(data: { title: string; description?: string | null; authorId: string }) {
    const r = await prisma.recipe.create({ data });
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      createdAt: r.createdAt,
    };
  }

  async listByAuthor(authorId: string, pagination: { page: number; pageSize: number }) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [total, itemsRaw] = await Promise.all([
      prisma.recipe.count({ where: { authorId } }),
      prisma.recipe.findMany({
        where: { authorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const items = itemsRaw.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      createdAt: r.createdAt,
    }));

    return { items, total, page, pageSize };
  }
}
