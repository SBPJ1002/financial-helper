import { z } from 'zod';

export const createDeclarationSchema = z.object({
  label: z.string().min(1).max(200),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'AUTO_DEBIT', 'CREDIT_CARD']),
  estimatedAmount: z.number().nonnegative(),
  categoryName: z.string().min(1).optional(),
  creditAccountId: z.string().min(1).optional(),
  amountTolerance: z.number().min(0).max(1).optional(),
  expectedDay: z.number().int().min(1).max(31).optional(),
  dayTolerance: z.number().int().min(0).max(15).optional(),
  matchKeywords: z.array(z.string().min(1)).optional(),
  matchCounterpartDocument: z.string().min(1).optional(),
});

export const updateDeclarationSchema = createDeclarationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const bulkCreateDeclarationsSchema = z.array(createDeclarationSchema).min(1).max(50);

export type CreateDeclarationInput = z.infer<typeof createDeclarationSchema>;
export type UpdateDeclarationInput = z.infer<typeof updateDeclarationSchema>;
