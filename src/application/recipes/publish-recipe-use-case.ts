import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';
import { AppError } from '../../shared/errors.js';

export class PublishRecipe {
  constructor(private recipes: RecipesRepository) {}
  async execute(input: { id: string; authorId: string }) {
    try {
      await this.recipes.publish(input.id, input.authorId);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new AppError('Receita não encontrada', 404);
      throw e;
    }
  }
}
