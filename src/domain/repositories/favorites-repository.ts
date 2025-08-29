import type { Recipe } from '../entities/recipe.js';

export interface FavoritesRepository {
  add(userId: string, recipeId: string): Promise<void>;
  remove(userId: string, recipeId: string): Promise<void>;
  listForUser(
    userId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: Recipe[]; total: number; page: number; pageSize: number }>;
}
