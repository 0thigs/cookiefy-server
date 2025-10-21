import { prisma } from '../../shared/db/prisma.js';
import type { ReviewsRepository } from '../../domain/repositories/reviews-repository.js';
import type { Review } from '../../domain/entities/review.js';

export class PrismaReviewsRepository implements ReviewsRepository {
  async create(data: {
    recipeId: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }): Promise<Review> {
    // Verificar se a receita existe e está publicada
    const recipe = await prisma.recipe.findFirst({
      where: { id: data.recipeId, status: 'PUBLISHED' },
    });

    if (!recipe) {
      throw new Error('NOT_FOUND');
    }

    // Verificar se já existe um review deste usuário para esta receita
    const existing = await prisma.review.findUnique({
      where: {
        recipeId_userId: {
          recipeId: data.recipeId,
          userId: data.userId,
        },
      },
    });

    if (existing) {
      throw new Error('ALREADY_EXISTS');
    }

    const review = await prisma.review.create({
      data: {
        recipeId: data.recipeId,
        userId: data.userId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    return review;
  }

  async update(data: {
    id: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }): Promise<Review> {
    // Verificar se o review existe e pertence ao usuário
    const existing = await prisma.review.findUnique({
      where: { id: data.id },
    });

    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    if (existing.userId !== data.userId) {
      throw new Error('FORBIDDEN');
    }

    const review = await prisma.review.update({
      where: { id: data.id },
      data: {
        rating: data.rating,
        comment: data.comment,
      },
    });

    return review;
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verificar se o review existe e pertence ao usuário
    const existing = await prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    if (existing.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    await prisma.review.delete({
      where: { id },
    });
  }

  async findByRecipeId(
    recipeId: string,
    pagination: { page: number; pageSize: number }
  ) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      prisma.review.count({
        where: { recipeId },
      }),
      prisma.review.findMany({
        where: { recipeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async findByUserAndRecipe(userId: string, recipeId: string): Promise<Review | null> {
    const review = await prisma.review.findUnique({
      where: {
        recipeId_userId: {
          recipeId,
          userId,
        },
      },
    });

    return review;
  }

  async getAverageRating(recipeId: string): Promise<number | null> {
    const result = await prisma.review.aggregate({
      where: { recipeId },
      _avg: {
        rating: true,
      },
    });

    return result._avg.rating;
  }
}
