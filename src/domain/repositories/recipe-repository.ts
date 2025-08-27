import type { Recipe } from '../entities/recipe.js';

export interface RecipesRepository {
  create(data: { title: string; description?: string | null; authorId: string }): Promise<Recipe>;
  listByAuthor(authorId: string): Promise<Recipe[]>;
}
