import { z } from 'zod';

export const createInvestmentSchema = z.object({
  name: z.string().min(1).max(200),
  investmentTypeId: z.string().min(1),
  amountInvested: z.number().positive(),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  yieldDescription: z.string().min(1).max(100),
  institution: z.string().min(1).max(200),
  status: z.enum(['ACTIVE', 'REDEEMED']).default('ACTIVE'),
  // Variable income fields
  assetId: z.string().optional(),
  quantity: z.number().optional(),
  averagePrice: z.number().optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Treasury fields
  treasuryTitle: z.string().optional(),
  treasuryRate: z.number().optional(),
  treasuryIndex: z.string().optional(),
});

export const updateInvestmentSchema = createInvestmentSchema.partial();

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
