import { z } from 'zod';

export const DifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);
export const RecipeStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'REJECTED']);
export const categoryLinkSchema = z.object({ categoryId: z.string().min(1) });

export const stepInputSchema = z.object({
  order: z.number().int().min(0),
  text: z.string().min(1),
  durationSec: z.number().int().min(0).optional(),
});

export const photoInputSchema = z.object({
  url: z.string().url(),
  alt: z.string().nullable().optional(),
  order: z.number().int().min(0).default(0),
});

export const ingredientInputSchema = z
  .object({
    ingredientId: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    unit: z.string().min(1).optional(),
  })
  .refine((v) => !!v.ingredientId || !!v.name, {
    message: 'Informe "ingredientId" ou "name" em cada ingrediente',
  });

export const recipeCoreSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  difficulty: DifficultyEnum.optional(),
  prepMinutes: z.number().int().min(0).optional(),
  cookMinutes: z.number().int().min(0).optional(),
  servings: z.number().int().min(1).optional(),
  nutrition: z.record(z.any()).optional(),
});

export const createRecipeFullSchema = z.object({
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  difficulty: DifficultyEnum.optional(),
  prepMinutes: z.number().int().positive().optional(),
  cookMinutes: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  nutrition: z.record(z.any()).optional(),

  steps: z
    .array(
      z.object({
        order: z.number().int(),
        text: z.string(),
        durationSec: z.number().int().nullable().optional(),
      }),
    )
    .optional(),

  photos: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().nullable().optional(),
        order: z.number().int().optional(),
      }),
    )
    .optional(),

  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().optional(),
        name: z.string().optional(),
        amount: z.number().min(0).nullable().optional(),
        unit: z.string().nullable().optional(),
      }).refine((v) => !!v.ingredientId || !!v.name, {
        message: 'Informe "ingredientId" ou "name" em cada ingrediente',
      }),
    )
    .optional(),
  categories: z.array(categoryLinkSchema).optional(),
});

export const updateRecipeSchema = recipeCoreSchema.partial().extend({
  description: z.string().nullable().optional(),
  difficulty: DifficultyEnum.nullable().optional(),
  prepMinutes: z.number().int().min(0).nullable().optional(),
  cookMinutes: z.number().int().min(0).nullable().optional(),
  servings: z.number().int().min(1).nullable().optional(),
  nutrition: z.record(z.any()).nullable().optional(),
  steps: z.array(stepInputSchema).optional(),
  photos: z.array(photoInputSchema).optional(),
  ingredients: z.array(ingredientInputSchema).optional(),
  categories: z.array(categoryLinkSchema).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const authorInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  photoUrl: z.string().nullable(),
});

export const recipeBriefOut = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  authorId: z.string(),
  author: authorInfoSchema,
  createdAt: z.string().datetime(),
  isFavorited: z.boolean().optional(),
});

export const recipeDetailOut = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  authorId: z.string(),
  author: authorInfoSchema,
  difficulty: DifficultyEnum.nullable().optional(),
  prepMinutes: z.number().int().nullable().optional(),
  cookMinutes: z.number().int().nullable().optional(),
  servings: z.number().int().nullable().optional(),
  nutrition: z.record(z.any()).nullable().optional(),
  status: RecipeStatusEnum,
  publishedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  isFavorited: z.boolean().optional(),
  steps: z.array(
    z.object({
      order: z.number().int(),
      text: z.string(),
      durationSec: z.number().int().nullable().optional(),
    }),
  ),
  photos: z.array(
    z.object({
      url: z.string().url(),
      alt: z.string().nullable().optional(),
      order: z.number().int(),
    }),
  ),
  ingredients: z.array(
    z.object({
      ingredientId: z.string(),
      name: z.string(),
      amount: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
    }),
  ),
  categories: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const paginatedRecipesOut = z.object({
  data: z.array(recipeBriefOut),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
});

export const publicListQuerySchema = paginationQuerySchema.extend({
  // Busca por texto (nome da receita, ingredientes, descrição)
  q: z.string().min(1).optional(),
  
  // Filtros básicos
  difficulty: DifficultyEnum.optional(),
  authorId: z.string().min(1).optional(),
  authorName: z.string().min(1).optional(), // Busca por nome do autor
  
  // Ordenação
  sort: z.enum(['newest', 'oldest', 'title_asc', 'title_desc', 'prep_time_asc', 'prep_time_desc', 'cook_time_asc', 'cook_time_desc']).default('newest'),

  // Filtros por categoria
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  categoryIds: z.string().min(1).optional(),
  categorySlugs: z.string().min(1).optional(),
  categoryMatch: z.enum(['any', 'all']).default('any'),

  // Filtros por tempo
  minPrep: z.coerce.number().min(0).optional(),
  maxPrep: z.coerce.number().min(0).optional(),
  minCook: z.coerce.number().min(0).optional(),
  maxCook: z.coerce.number().min(0).optional(),
  totalTimeMin: z.coerce.number().min(0).optional(), // Tempo total mínimo
  totalTimeMax: z.coerce.number().min(0).optional(), // Tempo total máximo
  
  // Filtros por ingredientes
  ingredient: z.string().min(1).optional(),
  ingredients: z.string().min(1).optional(), // Múltiplos ingredientes separados por vírgula
  
  // Filtros por valor nutricional
  maxCalories: z.coerce.number().min(0).optional(),
  minProtein: z.coerce.number().min(0).optional(),
  maxCarbs: z.coerce.number().min(0).optional(),
  maxFat: z.coerce.number().min(0).optional(),
  
  // Filtros por porções
  minServings: z.coerce.number().min(1).optional(),
  maxServings: z.coerce.number().min(1).optional(),
});
