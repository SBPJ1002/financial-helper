import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import type { CreateIncomeInput, UpdateIncomeInput } from '../validators/income.validator.js';

export async function list(userId: string) {
  return prisma.income.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: 'desc' },
  });
}

export async function listByMonth(userId: string, month: string) {
  const [year, mon] = month.split('-').map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);

  const allIncomes = await prisma.income.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  return allIncomes.filter(inc => {
    if (inc.recurrence === 'MONTHLY') return true;

    if (inc.recurrence === 'ONE_TIME') {
      return inc.date >= monthStart && inc.date <= monthEnd;
    }

    if (inc.recurrence === 'CONTRACT') {
      if (!inc.contractStartDate || !inc.contractMonths) return false;
      const contractEnd = new Date(inc.contractStartDate);
      contractEnd.setMonth(contractEnd.getMonth() + inc.contractMonths);
      return inc.contractStartDate <= monthEnd && contractEnd > monthStart;
    }

    return false;
  });
}

export async function create(userId: string, data: CreateIncomeInput) {
  return prisma.income.create({
    data: {
      userId,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      currency: data.currency,
      recurrence: data.recurrence,
      categoryId: data.categoryId || null,
      recurrenceDay: data.recurrenceDay || null,
      contractMonths: data.contractMonths || null,
      contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
    },
    include: { category: true },
  });
}

export async function update(userId: string, id: string, data: UpdateIncomeInput) {
  const income = await prisma.income.findFirst({ where: { id, userId } });
  if (!income) throw ApiError.notFound('Income not found');

  return prisma.income.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.recurrence !== undefined && { recurrence: data.recurrence }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.recurrenceDay !== undefined && { recurrenceDay: data.recurrenceDay || null }),
      ...(data.contractMonths !== undefined && { contractMonths: data.contractMonths || null }),
      ...(data.contractStartDate !== undefined && {
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
      }),
      ...(data.currency !== undefined && { currency: data.currency }),
    },
    include: { category: true },
  });
}

export async function remove(userId: string, id: string) {
  const income = await prisma.income.findFirst({ where: { id, userId } });
  if (!income) throw ApiError.notFound('Income not found');

  await prisma.income.delete({ where: { id } });
}
