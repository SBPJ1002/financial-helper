import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import type { CreateDeclarationInput, UpdateDeclarationInput } from '../validators/declaration.validator.js';

export async function list(userId: string) {
  return prisma.fixedExpenseDeclaration.findMany({
    where: { userId },
    include: {
      matches: {
        orderBy: { month: 'desc' },
        take: 1,
        include: { stdTransaction: { select: { descriptionOriginal: true, absoluteAmount: true, date: true } } },
      },
      creditAccount: { select: { id: true, accountLabel: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(userId: string, id: string) {
  const declaration = await prisma.fixedExpenseDeclaration.findFirst({
    where: { id, userId },
    include: {
      matches: {
        orderBy: { month: 'desc' },
        include: { stdTransaction: { select: { descriptionOriginal: true, absoluteAmount: true, date: true } } },
      },
      creditAccount: { select: { id: true, accountLabel: true } },
    },
  });
  if (!declaration) throw ApiError.notFound('Declaration not found');
  return declaration;
}

export async function create(userId: string, data: CreateDeclarationInput) {
  if (data.paymentMethod === 'CREDIT_CARD' && data.creditAccountId) {
    const account = await prisma.stdAccount.findFirst({
      where: { id: data.creditAccountId, userId },
    });
    if (!account) throw ApiError.badRequest('Invalid credit account');
  }

  return prisma.fixedExpenseDeclaration.create({
    data: {
      userId,
      label: data.label,
      paymentMethod: data.paymentMethod,
      estimatedAmount: data.estimatedAmount,
      categoryName: data.categoryName,
      creditAccountId: data.creditAccountId,
      amountTolerance: data.amountTolerance ?? 0.15,
      expectedDay: data.expectedDay,
      dayTolerance: data.dayTolerance ?? 5,
      matchKeywords: data.matchKeywords ?? [],
      matchCounterpartDocument: data.matchCounterpartDocument,
    },
    include: {
      creditAccount: { select: { id: true, accountLabel: true } },
    },
  });
}

export async function bulkCreate(userId: string, declarations: CreateDeclarationInput[]) {
  return prisma.$transaction(
    declarations.map(data =>
      prisma.fixedExpenseDeclaration.create({
        data: {
          userId,
          label: data.label,
          paymentMethod: data.paymentMethod,
          estimatedAmount: data.estimatedAmount,
          categoryName: data.categoryName,
          creditAccountId: data.creditAccountId,
          amountTolerance: data.amountTolerance ?? 0.15,
          expectedDay: data.expectedDay,
          dayTolerance: data.dayTolerance ?? 5,
          matchKeywords: data.matchKeywords ?? [],
          matchCounterpartDocument: data.matchCounterpartDocument,
        },
      })
    )
  );
}

export async function update(userId: string, id: string, data: UpdateDeclarationInput) {
  const declaration = await prisma.fixedExpenseDeclaration.findFirst({ where: { id, userId } });
  if (!declaration) throw ApiError.notFound('Declaration not found');

  if (data.paymentMethod === 'CREDIT_CARD' && data.creditAccountId) {
    const account = await prisma.stdAccount.findFirst({
      where: { id: data.creditAccountId, userId },
    });
    if (!account) throw ApiError.badRequest('Invalid credit account');
  }

  return prisma.fixedExpenseDeclaration.update({
    where: { id },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.estimatedAmount !== undefined && { estimatedAmount: data.estimatedAmount }),
      ...(data.categoryName !== undefined && { categoryName: data.categoryName }),
      ...(data.creditAccountId !== undefined && { creditAccountId: data.creditAccountId }),
      ...(data.amountTolerance !== undefined && { amountTolerance: data.amountTolerance }),
      ...(data.expectedDay !== undefined && { expectedDay: data.expectedDay }),
      ...(data.dayTolerance !== undefined && { dayTolerance: data.dayTolerance }),
      ...(data.matchKeywords !== undefined && { matchKeywords: data.matchKeywords }),
      ...(data.matchCounterpartDocument !== undefined && { matchCounterpartDocument: data.matchCounterpartDocument }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      matches: { orderBy: { month: 'desc' }, take: 1 },
      creditAccount: { select: { id: true, accountLabel: true } },
    },
  });
}

export async function remove(userId: string, id: string) {
  const declaration = await prisma.fixedExpenseDeclaration.findFirst({ where: { id, userId } });
  if (!declaration) throw ApiError.notFound('Declaration not found');

  await prisma.fixedExpenseDeclaration.delete({ where: { id } });
}
