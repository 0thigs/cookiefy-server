import { z } from 'zod';
import { paginationQuerySchema } from './recipes.schemas.js';

// Schema para verificar se uma receita está favoritada
export const favoriteStatusOut = z.object({
  isFavorited: z.boolean(),
  favoritedAt: z.string().datetime().nullable(),
});

// Schema para listagem de favoritos com filtros (igual ao de receitas)
export const favoritesListQuerySchema = paginationQuerySchema.extend({
  // Busca por texto (nome da receita, ingredientes, descrição)
  q: z.string().min(1).optional(),

  // Filtros básicos
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  authorId: z.string().min(1).optional(),
  authorName: z.string().min(1).optional(),

  // Ordenação (incluindo opções de receitas + favoritos)
  sort: z.enum([
    'newest',
    'oldest',
    'title_asc',
    'title_desc',
    'prep_time_asc',
    'prep_time_desc',
    'cook_time_asc',
    'cook_time_desc',
    'favorited_asc',
    'favorited_desc'
  ]).default('favorited_desc'), // Padrão: mais recentemente favoritado

  // Filtros por categoria
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  categoryIds: z.union([
    z.string().min(1).transform(val => val.split(',').map(s => s.trim())),
    z.array(z.string()).min(1)
  ]).optional(),
  categorySlugs: z.union([
    z.string().min(1).transform(val => val.split(',').map(s => s.trim())),
    z.array(z.string()).min(1)
  ]).optional(),
  categoryMatch: z.enum(['any', 'all']).default('any'),

  // Filtros por tempo
  minPrep: z.coerce.number().min(0).optional(),
  maxPrep: z.coerce.number().min(0).optional(),
  minCook: z.coerce.number().min(0).optional(),
  maxCook: z.coerce.number().min(0).optional(),
  totalTimeMin: z.coerce.number().min(0).optional(),
  totalTimeMax: z.coerce.number().min(0).optional(),

  // Filtros por ingredientes
  ingredient: z.string().min(1).optional(),
  ingredients: z.union([
    z.string().min(1).transform(val => val.split(',').map(s => s.trim())),
    z.array(z.string()).min(1)
  ]).optional(),

  // Filtros por valor nutricional
  maxCalories: z.coerce.number().min(0).optional(),
  minProtein: z.coerce.number().min(0).optional(),
  maxCarbs: z.coerce.number().min(0).optional(),
  maxFat: z.coerce.number().min(0).optional(),

  // Filtros por porções
  minServings: z.coerce.number().min(1).optional(),
  maxServings: z.coerce.number().min(1).optional(),
});

// Schema para resposta de favorito individual
export const favoriteRecipeOut = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  authorId: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    photoUrl: z.string().nullable(),
  }),
  createdAt: z.string().datetime(),
  favoritedAt: z.string().datetime(),
  nutrition: z.record(z.any()).nullable(),
  ingredients: z.array(z.object({
    ingredientId: z.string(),
    name: z.string(),
    amount: z.number().nullable(),
    unit: z.string().nullable(),
  })),
});

// Schema para resposta paginada de favoritos
export const paginatedFavoritesOut = z.object({
  data: z.array(favoriteRecipeOut),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
});

// Schema para resposta de estatísticas de favoritos
export const favoritesStatsOut = z.object({
  totalFavorites: z.number(),
  recentFavorites: z.number(), // Últimos 7 dias
  mostFavoritedCategory: z.string().nullable(),
  averageRating: z.number().nullable(),
});
