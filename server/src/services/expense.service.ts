import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseHistoryInput,
  ExpenseGoalInput,
} from '../validators/expense.validator.js';

export async function list(userId: string, type?: 'FIXED' | 'VARIABLE') {
  return prisma.expense.findMany({
    where: {
      userId,
      ...(type && { type }),
    },
    include: {
      category: true,
      history: { orderBy: { month: 'asc' } },
      goal: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: {
      category: true,
      history: { orderBy: { month: 'asc' } },
      goal: true,
    },
  });
  if (!expense) throw ApiError.notFound('Expense not found');
  return expense;
}

export async function create(userId: string, data: CreateExpenseInput) {
  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw ApiError.badRequest('Invalid category');

  const expense = await prisma.expense.create({
    data: {
      userId,
      description: data.description,
      amount: data.amount,
      type: data.type,
      currency: data.currency,
      categoryId: data.categoryId,
      date: new Date(data.date),
      dueDay: data.dueDay,
      status: data.status,
      paymentMethod: data.paymentMethod,
      fixedAmountType: data.type === 'FIXED' ? (data.fixedAmountType ?? 'FIXED_AMOUNT') : null,
    },
    include: { category: true, history: true, goal: true },
  });

  if (data.type === 'FIXED') {
    const d = new Date(data.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    await prisma.expenseHistory.upsert({
      where: { expenseId_month: { expenseId: expense.id, month } },
      update: { amount: data.amount },
      create: { expenseId: expense.id, month, amount: data.amount },
    });
  }

  return prisma.expense.findUnique({
    where: { id: expense.id },
    include: { category: true, history: { orderBy: { month: 'asc' } }, goal: true },
  });
}

export async function update(userId: string, id: string, data: UpdateExpenseInput) {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId },
    });
    if (!category) throw ApiError.badRequest('Invalid category');
  }

  return prisma.expense.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.dueDay !== undefined && { dueDay: data.dueDay }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.fixedAmountType !== undefined && { fixedAmountType: data.fixedAmountType }),
      ...(data.currency !== undefined && { currency: data.currency }),
    },
    include: { category: true, history: true, goal: true },
  });
}

export async function remove(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  await prisma.expense.delete({ where: { id } });
}

export async function deleteFuture(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({ where: { id, userId, type: 'FIXED' } });
  if (!expense) throw ApiError.notFound('Fixed expense not found');

  // Delete this expense + all future ones with same description and type FIXED
  const deleted = await prisma.expense.deleteMany({
    where: {
      userId,
      description: expense.description,
      type: 'FIXED',
      date: { gte: expense.date },
    },
  });

  return { deleted: deleted.count };
}

export async function updateFutureAmount(userId: string, id: string, amount: number) {
  const expense = await prisma.expense.findFirst({ where: { id, userId, type: 'FIXED' } });
  if (!expense) throw ApiError.notFound('Fixed expense not found');

  // Update amount on this expense + all future ones with same description and type FIXED
  const updated = await prisma.expense.updateMany({
    where: {
      userId,
      description: expense.description,
      type: 'FIXED',
      date: { gte: expense.date },
    },
    data: { amount },
  });

  return { updated: updated.count };
}

// --- Expense History ---

export async function addHistory(userId: string, expenseId: string, data: ExpenseHistoryInput) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  return prisma.expenseHistory.upsert({
    where: { expenseId_month: { expenseId, month: data.month } },
    update: { amount: data.amount },
    create: { expenseId, month: data.month, amount: data.amount },
  });
}

export async function getHistory(userId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  return prisma.expenseHistory.findMany({
    where: { expenseId },
    orderBy: { month: 'asc' },
  });
}

// --- Expense Goals ---

export async function setGoal(userId: string, expenseId: string, data: ExpenseGoalInput) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  return prisma.expenseGoal.upsert({
    where: { expenseId },
    update: { limit: data.limit },
    create: { expenseId, limit: data.limit },
  });
}

export async function removeGoal(userId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  const goal = await prisma.expenseGoal.findUnique({ where: { expenseId } });
  if (!goal) throw ApiError.notFound('Goal not found');

  await prisma.expenseGoal.delete({ where: { expenseId } });
}

// --- Generate Recurring ---

export async function generateRecurring(userId: string, id: string, months: number) {
  const expense = await prisma.expense.findFirst({
    where: { id, userId, type: 'FIXED' },
  });
  if (!expense) throw ApiError.notFound('Fixed expense not found');

  const now = new Date();
  let created = 0;

  for (let i = 1; i <= months; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

    // Check if a record already exists for this expense in this month
    const existing = await prisma.expense.findFirst({
      where: {
        userId,
        description: expense.description,
        type: 'FIXED',
        date: {
          gte: new Date(futureDate.getFullYear(), futureDate.getMonth(), 1),
          lt: new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 1),
        },
      },
    });
    if (existing) continue;

    // Set date to dueDay of the future month (or 1st if no dueDay)
    const day = Math.min(expense.dueDay || 1, new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 0).getDate());
    const recordDate = new Date(futureDate.getFullYear(), futureDate.getMonth(), day);

    const created_expense = await prisma.expense.create({
      data: {
        userId,
        description: expense.description,
        amount: expense.fixedAmountType === 'FIXED_AMOUNT' ? expense.amount : 0,
        type: 'FIXED',
        currency: expense.currency,
        categoryId: expense.categoryId,
        date: recordDate,
        dueDay: expense.dueDay,
        status: 'PENDING',
        fixedAmountType: expense.fixedAmountType,
      },
    });

    const historyAmount = expense.fixedAmountType === 'FIXED_AMOUNT' ? expense.amount : 0;
    await prisma.expenseHistory.create({
      data: { expenseId: created_expense.id, month: monthStr, amount: historyAmount },
    });

    created++;
  }

  return { created, months };
}

// --- Toggle Type ---

export async function toggleType(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true, history: true, goal: true },
  });
  if (!expense) throw ApiError.notFound('Expense not found');

  const newType = expense.type === 'FIXED' ? 'VARIABLE' : 'FIXED';

  return prisma.expense.update({
    where: { id },
    data: {
      type: newType,
      // When switching to VARIABLE: clear dueDay and fixedAmountType
      // When switching to FIXED: set fixedAmountType to FIXED_AMOUNT, extract dueDay from date
      ...(newType === 'VARIABLE'
        ? { dueDay: null, fixedAmountType: null }
        : { dueDay: expense.date.getDate(), fixedAmountType: 'FIXED_AMOUNT' as const }),
    },
    include: { category: true, history: true, goal: true },
  });
}

// --- Projections ---

export async function getProjections(userId: string, monthsAhead: number = 6) {
  const fixedExpenses = await prisma.expense.findMany({
    where: { userId, type: 'FIXED', stdTransactionId: null },
    include: { category: true },
  });

  const now = new Date();
  const projections: Array<{
    expenseId: string;
    description: string;
    category: { name: string; emoji: string };
    dueDay: number | null;
    month: string;
    amount: number | null;
    status: string;
    fixedAmountType: string | null;
  }> = [];

  for (let i = 1; i <= monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (const exp of fixedExpenses) {
      const isVariableAmount = exp.fixedAmountType === 'VARIABLE_AMOUNT';
      projections.push({
        expenseId: exp.id,
        description: exp.description,
        category: { name: exp.category.name, emoji: exp.category.emoji },
        dueDay: exp.dueDay,
        month,
        amount: isVariableAmount ? null : exp.amount,
        status: isVariableAmount ? 'AWAITING_INPUT' : 'PROJECTED',
        fixedAmountType: exp.fixedAmountType,
      });
    }
  }

  return projections;
}
