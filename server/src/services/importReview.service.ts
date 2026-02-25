import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export async function getImportBatch(userId: string, batchId: string) {
  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: { userId, importBatchId: batchId },
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: { userId, importBatchId: batchId },
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
  ]);
  return { incomes, expenses };
}

export async function bulkRename(
  userId: string,
  oldDescription: string,
  newDescription: string,
  scope: 'all' | 'batch',
  batchId?: string,
) {
  const where = {
    userId,
    description: oldDescription,
    ...(scope === 'batch' && batchId ? { importBatchId: batchId } : {}),
  };

  const [expResult, incResult] = await Promise.all([
    prisma.expense.updateMany({ where, data: { description: newDescription } }),
    prisma.income.updateMany({ where, data: { description: newDescription } }),
  ]);

  return { updatedExpenses: expResult.count, updatedIncomes: incResult.count };
}

export async function toggleExpenseType(userId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  const newType = expense.type === 'FIXED' ? 'VARIABLE' : 'FIXED';
  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      type: newType,
      dueDay: newType === 'VARIABLE' ? null : expense.date.getDate(),
      fixedAmountType: newType === 'FIXED' ? 'FIXED_AMOUNT' : null,
    },
    include: { category: true },
  });
}

export async function renameItem(
  userId: string,
  type: 'income' | 'expense',
  id: string,
  newDescription: string,
) {
  if (type === 'income') {
    const income = await prisma.income.findFirst({ where: { id, userId } });
    if (!income) throw ApiError.notFound('Income not found');
    return prisma.income.update({
      where: { id },
      data: { description: newDescription },
      include: { category: true },
    });
  } else {
    const expense = await prisma.expense.findFirst({ where: { id, userId } });
    if (!expense) throw ApiError.notFound('Expense not found');
    return prisma.expense.update({
      where: { id },
      data: { description: newDescription },
      include: { category: true },
    });
  }
}
