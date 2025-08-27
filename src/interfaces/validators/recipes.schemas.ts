import { z } from 'zod';
export const createRecipeSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional()
});
