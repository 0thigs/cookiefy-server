import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';

export class CreateRecipe {
  constructor(private recipes: RecipesRepository) {}
  async execute(input: { title: string; description?: string | null; authorId: string }) {
    return this.recipes.create(input);
  }
}
