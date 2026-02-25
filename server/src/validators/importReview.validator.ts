import { z } from 'zod';

export const bulkRenameSchema = z.object({
  oldDescription: z.string().min(1),
  newDescription: z.string().min(1).max(200),
  scope: z.enum(['all', 'batch']),
  batchId: z.string().optional(),
});

export const renameItemSchema = z.object({
  type: z.enum(['income', 'expense']),
  id: z.string().min(1),
  newDescription: z.string().min(1).max(200),
});

export const importModeSchema = z.object({
  mode: z.enum(['all', 'expenses_only', 'incomes_only']).default('all'),
});

export type BulkRenameInput = z.infer<typeof bulkRenameSchema>;
export type RenameItemInput = z.infer<typeof renameItemSchema>;
export type ImportModeInput = z.infer<typeof importModeSchema>;
