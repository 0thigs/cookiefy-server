import { z } from 'zod';

export const categoryOut = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(1).optional(),
});

export const categoriesListOut = z.object({
  data: z.array(categoryOut),
});
