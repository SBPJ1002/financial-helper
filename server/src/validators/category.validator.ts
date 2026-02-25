import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().max(4).default(''),
  type: z.enum(['EXPENSE', 'INCOME', 'BOTH']).default('EXPENSE'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
