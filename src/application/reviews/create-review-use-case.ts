import type { ReviewsRepository } from '../../domain/repositories/reviews-repository.js';
import { AppError } from '../../shared/errors.js';

export class CreateReview {
  constructor(private reviews: ReviewsRepository) {}

  async execute(input: {
    recipeId: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }) {
    // Validar rating
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError('A nota deve estar entre 1 e 5', 400);
    }

    try {
      const review = await this.reviews.create(input);
      return review;
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new AppError('Receita não encontrada ou não publicada', 404);
      }
      if (e?.message === 'ALREADY_EXISTS') {
        throw new AppError('Você já avaliou esta receita', 409);
      }
      throw e;
    }
  }
}
