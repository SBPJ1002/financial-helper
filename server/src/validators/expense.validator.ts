import { z } from 'zod';

export const createExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  type: z.enum(['FIXED', 'VARIABLE']),
  currency: z.string().length(3).optional(),
  categoryId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDay: z.number().int().min(1).max(31).optional(),
  status: z.enum(['PAID', 'PENDING']).default('PENDING'),
  paymentMethod: z.enum(['CASH', 'CREDIT', 'DEBIT', 'PIX']).optional(),
  fixedAmountType: z.enum(['FIXED_AMOUNT', 'VARIABLE_AMOUNT']).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseHistorySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive(),
});

export const expenseGoalSchema = z.object({
  limit: z.number().positive(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseHistoryInput = z.infer<typeof expenseHistorySchema>;
export type ExpenseGoalInput = z.infer<typeof expenseGoalSchema>;
