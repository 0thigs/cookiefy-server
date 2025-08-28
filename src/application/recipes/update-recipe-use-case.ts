import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';
import { AppError } from '../../shared/errors.js';

export class UpdateRecipe {
  constructor(private recipes: RecipesRepository) {}

  async execute(input: {
    id: string;
    authorId: string;
    data: Partial<{
      title: string;
      description: string | null;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
      prepMinutes: number | null;
      cookMinutes: number | null;
      servings: number | null;
      nutrition: any | null;
      steps: Array<{ order: number; text: string; durationSec?: number | null }>;
      photos: Array<{ url: string; alt?: string | null; order?: number }>;
      ingredients: Array<{
        ingredientId?: string;
        name?: string;
        amount?: number | null;
        unit?: string | null;
      }>;
    }>;
  }) {
    try {
      await this.recipes.updateWithNested(input.id, input.authorId, input.data);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new AppError('Receita não encontrada', 404);
      throw e;
    }
  }
}
