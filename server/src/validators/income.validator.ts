import { z } from 'zod';

export const createIncomeSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).optional(),
  recurrence: z.enum(['MONTHLY', 'ONE_TIME', 'CONTRACT']).default('MONTHLY'),
  categoryId: z.string().min(1).optional(),
  recurrenceDay: z.number().int().min(1).max(31).optional(),
  contractMonths: z.number().int().min(1).max(120).optional(),
  contractStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
