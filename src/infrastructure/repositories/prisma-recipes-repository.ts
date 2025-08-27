import { prisma } from '../../shared/db/prisma.js';
import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';

export class PrismaRecipesRepository implements RecipesRepository {
  async create(data: { title: string; description?: string | null; authorId: string }) {
    return prisma.recipe.create({ data });
  }
  async listByAuthor(authorId: string) {
    return prisma.recipe.findMany({ where: { authorId }, orderBy: { createdAt: 'desc' } });
  }
}
