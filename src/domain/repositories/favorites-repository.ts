import type { Recipe } from '../entities/recipe.js';

export interface FavoritesRepository {
  add(userId: string, recipeId: string): Promise<void>;
  remove(userId: string, recipeId: string): Promise<void>;
  isFavorited(userId: string, recipeId: string): Promise<boolean>;
  getFavoriteStatus(userId: string, recipeId: string): Promise<{ isFavorited: boolean; favoritedAt: Date | null }>;
  listForUser(
    userId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: Recipe[]; total: number; page: number; pageSize: number }>;
  listForUserWithFilters(
    userId: string,
    filters: {
      page: number;
      pageSize: number;
      q?: string;
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
      authorId?: string;
      authorName?: string;
      sort?: 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'prep_time_asc' | 'prep_time_desc' | 'favorited_asc' | 'favorited_desc';
      categoryId?: string;
      categorySlug?: string;
      categoryIds?: string[];
      categorySlugs?: string[];
      categoryMatch?: 'any' | 'all';
      minPrep?: number;
      maxPrep?: number;
      minCook?: number;
      maxCook?: number;
      totalTimeMin?: number;
      totalTimeMax?: number;
      ingredient?: string;
      ingredients?: string[];
      maxCalories?: number;
      minProtein?: number;
      maxCarbs?: number;
      maxFat?: number;
      minServings?: number;
      maxServings?: number;
    }
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }>;
  getStats(userId: string): Promise<{
    totalFavorites: number;
    recentFavorites: number;
    mostFavoritedCategory: string | null;
    averageRating: number | null;
  }>;
}
