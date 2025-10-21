import type { ReviewsRepository } from '../../domain/repositories/reviews-repository.js';
import { AppError } from '../../shared/errors.js';

export class DeleteReview {
  constructor(private reviews: ReviewsRepository) {}

  async execute(id: string, userId: string) {
    try {
      await this.reviews.delete(id, userId);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new AppError('Avaliação não encontrada', 404);
      }
      if (e?.message === 'FORBIDDEN') {
        throw new AppError('Você não tem permissão para deletar esta avaliação', 403);
      }
      throw e;
    }
  }
}
