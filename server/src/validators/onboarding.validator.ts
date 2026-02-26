import { z } from 'zod';

export const updateProfileSchema = z.object({
  primaryGoal: z.enum(['SAVE_MORE', 'PAY_OFF_DEBT', 'CONTROL_SPENDING', 'INVEST_MORE', 'BUILD_EMERGENCY_FUND']).optional(),
  financialControlScore: z.number().int().min(1).max(5).optional(),
  bankAccountCount: z.number().int().min(0).optional(),
  creditCardCount: z.number().int().min(0).optional(),
  preferredPaymentMethods: z.array(z.string()).optional(),
  incomeType: z.enum(['CLT', 'SELF_EMPLOYED', 'FREELANCER', 'BUSINESS_OWNER', 'RETIREMENT', 'OTHER_INCOME']).optional(),
  expectedIncomeDay: z.number().int().min(1).max(31).optional().nullable(),
  incomeRange: z.enum(['UP_TO_2K', 'FROM_2K_TO_5K', 'FROM_5K_TO_10K', 'FROM_10K_TO_20K', 'ABOVE_20K']).optional(),
  incomeIsVariable: z.boolean().optional(),
  housingType: z.enum(['OWN_PAID', 'OWN_MORTGAGE', 'RENT', 'FAMILY']).optional(),
  hasDependents: z.boolean().optional(),
  dependentTypes: z.array(z.string()).optional(),
  expectedFixedExpenses: z.array(z.string()).optional(),
  onboardingStepReached: z.number().int().min(0).max(6).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
