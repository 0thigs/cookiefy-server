import { z } from 'zod';

export const addItemSchema = z.object({
  ingredientId: z.string().min(1).optional(),
  recipeId: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
});

export const updateItemSchema = z.object({
  note: z.string().nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  unit: z.string().min(1).nullable().optional(),
  isChecked: z.boolean().optional(),
});

export const shoppingListOut = z.object({
  list: z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      ingredientId: z.string().nullable(),
      recipeId: z.string().nullable(),
      note: z.string().nullable(),
      amount: z.number().nullable(),
      unit: z.string().nullable(),
      isChecked: z.boolean(),
      ingredient: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable(),
      recipe: z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .nullable(),
    })
  ),
});

export const itemOut = z.object({
  id: z.string(),
  ingredientId: z.string().nullable(),
  recipeId: z.string().nullable(),
  note: z.string().nullable(),
  amount: z.number().nullable(),
  unit: z.string().nullable(),
  isChecked: z.boolean(),
});

export const addRecipeResponseOut = z.object({
  count: z.number(),
});
