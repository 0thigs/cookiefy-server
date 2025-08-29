import type { Recipe } from '../entities/recipe.js';

export interface RecipesRepository {
  create(data: { title: string; description?: string | null; authorId: string }): Promise<Recipe>;

  listByAuthor(
    authorId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: Recipe[]; total: number; page: number; pageSize: number }>;

  createWithNested(data: {
    authorId: string;
    title: string;
    description?: string | null;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    prepMinutes?: number | null;
    cookMinutes?: number | null;
    servings?: number | null;
    nutrition?: any | null;
    steps?: Array<{ order: number; text: string; durationSec?: number | null }>;
    photos?: Array<{ url: string; alt?: string | null; order?: number }>;
    ingredients?: Array<{
      ingredientId?: string;
      name?: string;
      amount?: number | null;
      unit?: string | null;
    }>;
    categories?: Array<{ categoryId: string }>;
  }): Promise<{ id: string }>;

  updateWithNested(
    id: string,
    authorId: string,
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
      categories: Array<{ categoryId: string }>;
    }>,
  ): Promise<void>;

  publish(id: string, authorId: string): Promise<void>;
  delete(id: string, authorId: string): Promise<void>;

  findPublicById(id: string): Promise<any | null>;
  findByIdForAuthor(id: string, authorId: string): Promise<any | null>;

  listPublic(filters: {
    page: number;
    pageSize: number;
    q?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    authorId?: string;
    sort?: 'newest' | 'oldest';
    categoryId?: string;
    categorySlug?: string;
    minPrep?: number;
    maxPrep?: number;
    minCook?: number;
    maxCook?: number;
    ingredients?: string[];
  }): Promise<{ items: Recipe[]; total: number; page: number; pageSize: number }>;
}
