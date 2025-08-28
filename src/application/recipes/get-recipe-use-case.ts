import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';
import { AppError } from '../../shared/errors.js';

export class GetRecipe {
  constructor(private recipes: RecipesRepository) {}

  async getPublic(id: string) {
    const r = await this.recipes.findPublicById(id);
    if (!r) throw new AppError('Receita não encontrada', 404);
    return r;
  }

  async getForAuthor(id: string, authorId: string) {
    const r = await this.recipes.findByIdForAuthor(id, authorId);
    if (!r) throw new AppError('Receita não encontrada', 404);
    return r;
  }
}
