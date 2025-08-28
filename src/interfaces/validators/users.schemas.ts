import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  photoUrl: z.string().url().nullable().optional(),
});
