import type { ReviewsRepository } from '../../domain/repositories/reviews-repository.js';
import { AppError } from '../../shared/errors.js';

export class UpdateReview {
  constructor(private reviews: ReviewsRepository) {}

  async execute(input: {
    id: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }) {
    // Validar rating
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError('A nota deve estar entre 1 e 5', 400);
    }

    try {
      const review = await this.reviews.update(input);
      return review;
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new AppError('Avaliação não encontrada', 404);
      }
      if (e?.message === 'FORBIDDEN') {
        throw new AppError('Você não tem permissão para editar esta avaliação', 403);
      }
      throw e;
    }
  }
}
