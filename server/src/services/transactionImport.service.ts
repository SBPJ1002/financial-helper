import { prisma } from '../config/prisma.js';
import { ClassificationService } from './classification/classification-service.js';
import type { ImportResult } from './classification/classification-service.js';
import { cleanDescription } from './standardization/description-cleaner.js';

// Re-export ImportResult for consumers
export type { ImportResult };

type ImportMode = 'all' | 'expenses_only' | 'incomes_only';

/**
 * Import un-imported StdTransactions as Expenses/Incomes using
 * the 3-layer classification engine (user rules → recurrence → keywords → fallback).
 */
export async function importTransactions(
  userId: string,
  mode: ImportMode = 'all',
): Promise<ImportResult> {
  const service = new ClassificationService();
  return service.processNewTransactions(userId, mode);
}

// --- Update Linked Records ---

/**
 * When a transaction is updated (amount or description changed),
 * update the linked expense or income to reflect the new values.
 */
export async function updateLinkedRecords(
  stdTransactionId: string,
  newAmount: number,
  newDescription: string,
): Promise<void> {
  const tx = await prisma.stdTransaction.findUnique({
    where: { id: stdTransactionId },
    include: { expense: true, income: true },
  });

  if (!tx || !tx.imported) return;

  const absAmount = Math.abs(newAmount);
  const displayDescription = cleanDescription(newDescription);

  if (tx.expense) {
    await prisma.expense.update({
      where: { id: tx.expense.id },
      data: { amount: absAmount, description: displayDescription },
    });
  }

  if (tx.income) {
    await prisma.income.update({
      where: { id: tx.income.id },
      data: { amount: absAmount, description: displayDescription },
    });
  }
}
