import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export async function list(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(userId: string, id: string) {
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) throw ApiError.notFound('Notification not found');
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function generateNotifications() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const now = new Date();
  const today = now.getDate();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1-based
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  for (const { id: userId } of users) {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });

    // BILL_DUE: Fixed expenses with dueDay within 3 days
    if (!settings || settings.alertBillDue) {
      const fixedExpenses = await prisma.expense.findMany({
        where: {
          userId,
          type: 'FIXED',
          status: 'PENDING',
          dueDay: { not: null },
        },
        select: { id: true, description: true, dueDay: true, amount: true },
      });

      for (const exp of fixedExpenses) {
        if (!exp.dueDay) continue;
        const daysUntilDue = exp.dueDay - today;
        if (daysUntilDue >= 0 && daysUntilDue <= 3) {
          await createIfNotExists(userId, 'BILL_DUE', todayStr, exp.id,
            `Conta próxima do vencimento`,
            `"${exp.description}" vence dia ${exp.dueDay} (R$ ${exp.amount.toFixed(2)}).`
          );
        }
      }
    }

    // VARIABLE_AMOUNT_NEEDED: VARIABLE_AMOUNT fixed expenses without history for current month
    if (!settings || settings.alertBillDue) {
      const variableExpenses = await prisma.expense.findMany({
        where: {
          userId,
          type: 'FIXED',
          fixedAmountType: 'VARIABLE_AMOUNT',
        },
        include: {
          history: {
            where: { month: monthStr },
          },
        },
      });

      for (const exp of variableExpenses) {
        if (exp.history.length === 0) {
          await createIfNotExists(userId, 'VARIABLE_AMOUNT_NEEDED', todayStr, exp.id,
            `Valor pendente`,
            `"${exp.description}" precisa do valor deste mês.`
          );
        }
      }
    }

    // CONTRACT_ENDING: CONTRACT incomes ending within 30 days
    if (!settings || settings.alertBillDue) {
      const contractIncomes = await prisma.income.findMany({
        where: {
          userId,
          recurrence: 'CONTRACT',
          contractStartDate: { not: null },
          contractMonths: { not: null },
        },
        select: { id: true, description: true, contractStartDate: true, contractMonths: true },
      });

      for (const inc of contractIncomes) {
        if (!inc.contractStartDate || !inc.contractMonths) continue;
        const endDate = new Date(inc.contractStartDate);
        endDate.setMonth(endDate.getMonth() + inc.contractMonths);
        const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilEnd >= 0 && daysUntilEnd <= 30) {
          await createIfNotExists(userId, 'CONTRACT_ENDING', todayStr, inc.id,
            `Contrato terminando`,
            `"${inc.description}" encerra em ${daysUntilEnd} dia(s).`
          );
        }
      }
    }

    // EXPENSE_ABOVE: Expenses exceeding ExpenseGoal limit this month
    if (!settings || settings.alertExpenseAbove) {
      const goalsWithExpenses = await prisma.expenseGoal.findMany({
        where: { expense: { userId } },
        include: {
          expense: {
            include: {
              history: {
                where: { month: monthStr },
              },
            },
          },
        },
      });

      for (const goal of goalsWithExpenses) {
        const monthlyAmount = goal.expense.history.length > 0
          ? goal.expense.history[0].amount
          : goal.expense.amount;
        if (monthlyAmount > goal.limit) {
          await createIfNotExists(userId, 'EXPENSE_ABOVE', todayStr, goal.expense.id,
            `Gasto acima do limite`,
            `"${goal.expense.description}" está R$ ${(monthlyAmount - goal.limit).toFixed(2)} acima do limite de R$ ${goal.limit.toFixed(2)}.`
          );
        }
      }
    }
  }
}

async function createIfNotExists(
  userId: string, type: string, dateStr: string, refId: string,
  title: string, message: string,
) {
  // Dedup: don't create if same type+refId notification already exists today
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: type as any,
      metadata: { contains: refId },
      createdAt: {
        gte: new Date(dateStr + 'T00:00:00Z'),
        lt: new Date(dateStr + 'T23:59:59Z'),
      },
    },
  });
  if (existing) return;

  await prisma.notification.create({
    data: {
      userId,
      type: type as any,
      title,
      message,
      metadata: JSON.stringify({ refId }),
    },
  });
}
