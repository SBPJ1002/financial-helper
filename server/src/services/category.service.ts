import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator.js';

export async function list(userId: string, type?: string) {
  return prisma.category.findMany({
    where: {
      userId,
      ...(type ? { type: { in: [type as any, 'BOTH' as any] } } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

export async function create(userId: string, data: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: data.name } },
  });
  if (existing) throw ApiError.conflict('Category already exists');

  return prisma.category.create({
    data: {
      userId,
      name: data.name,
      emoji: data.emoji,
      type: data.type ?? 'EXPENSE',
      isDefault: false,
    },
  });
}

export async function update(userId: string, id: string, data: UpdateCategoryInput) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw ApiError.notFound('Category not found');

  if (data.name !== undefined && data.name !== category.name) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name: data.name } },
    });
    if (existing) throw ApiError.conflict('Category already exists');
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.emoji !== undefined && { emoji: data.emoji }),
      ...(data.type !== undefined && { type: data.type }),
    },
  });
}

export async function remove(userId: string, id: string) {
  const category = await prisma.category.findFirst({
    where: { id, OR: [{ userId }, { isDefault: true }] },
  });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.isDefault) throw ApiError.badRequest('Cannot delete default category');

  const [usedByExpenses, usedByIncomes] = await Promise.all([
    prisma.expense.count({ where: { categoryId: id } }),
    prisma.income.count({ where: { categoryId: id } }),
  ]);
  if (usedByExpenses > 0) throw ApiError.badRequest('Category is in use by expenses');
  if (usedByIncomes > 0) throw ApiError.badRequest('Category is in use by incomes');

  await prisma.category.delete({ where: { id } });
}
