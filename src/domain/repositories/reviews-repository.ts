import type { Review } from '../entities/review.js';

export interface ReviewsRepository {
  create(data: {
    recipeId: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }): Promise<Review>;

  update(data: {
    id: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }): Promise<Review>;

  delete(id: string, userId: string): Promise<void>;

  findByRecipeId(
    recipeId: string,
    pagination: { page: number; pageSize: number }
  ): Promise<{
    items: Array<Review & { user: { id: string; name: string; photoUrl: string | null } }>;
    total: number;
    page: number;
    pageSize: number;
  }>;

  findByUserAndRecipe(userId: string, recipeId: string): Promise<Review | null>;

  getAverageRating(recipeId: string): Promise<number | null>;
}
