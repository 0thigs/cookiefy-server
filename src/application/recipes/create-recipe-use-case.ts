import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';

export class CreateRecipe {
  constructor(private recipes: RecipesRepository) {}

  async execute(input: { title: string; description?: string | null; authorId: string }) {
    const r = await this.recipes.create(input);
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      createdAt: r.createdAt,
    };
  }
}
