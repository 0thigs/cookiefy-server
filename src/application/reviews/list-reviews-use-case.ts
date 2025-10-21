import type { ReviewsRepository } from '../../domain/repositories/reviews-repository.js';

export class ListReviews {
  constructor(private reviews: ReviewsRepository) {}

  async byRecipe(recipeId: string, pagination: { page: number; pageSize: number }) {
    return await this.reviews.findByRecipeId(recipeId, pagination);
  }

  async getAverageRating(recipeId: string) {
    return await this.reviews.getAverageRating(recipeId);
  }

  async getUserReviewForRecipe(userId: string, recipeId: string) {
    return await this.reviews.findByUserAndRecipe(userId, recipeId);
  }
}
