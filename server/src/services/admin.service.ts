import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export async function listUsers(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            incomes: true,
            expenses: true,
            chatMessages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  return { users, total, page, pages: Math.ceil(total / limit) };
}

export async function updateUser(id: string, data: { isActive?: boolean; role?: 'USER' | 'ADMIN' }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });
}

export async function getMetrics() {
  const [totalUsers, activeUsers, totalIncomes, totalExpenses, totalMessages] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.income.count(),
      prisma.expense.count(),
      prisma.chatMessage.count(),
    ]);

  // Recent activity (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [recentSessions, recentMessages] = await Promise.all([
    prisma.session.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.chatMessage.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  // Recent metrics
  const recentMetrics = await prisma.systemMetric.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    users: { total: totalUsers, active: activeUsers },
    data: {
      incomes: totalIncomes,
      expenses: totalExpenses,
      chatMessages: totalMessages,
    },
    activity: {
      sessionsLast7Days: recentSessions,
      messagesLast7Days: recentMessages,
    },
    recentMetrics,
  };
}

export async function getLogs(page = 1, limit = 50, key?: string) {
  const skip = (page - 1) * limit;

  const where = key ? { key } : {};

  const [logs, total] = await Promise.all([
    prisma.systemMetric.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.systemMetric.count({ where }),
  ]);

  return { logs, total, page, pages: Math.ceil(total / limit) };
}
