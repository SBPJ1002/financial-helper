import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { buildSystemPrompt } from './promptBuilder.service.js';
import { getAdapterForUser } from './ai.service.js';

const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_MINUTE = 10;

export async function sendMessage(userId: string, userMessage: string) {
  // Rate limit check
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW);
  const recentCount = await prisma.chatMessage.count({
    where: {
      userId,
      role: 'user',
      createdAt: { gte: windowStart },
    },
  });

  if (recentCount >= MAX_MESSAGES_PER_MINUTE) {
    throw ApiError.badRequest('Rate limit reached. Please wait a moment before sending another message.');
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { userId, role: 'user', content: userMessage },
  });

  // Build system prompt with user's financial data
  const systemPrompt = await buildSystemPrompt(userId);

  // Fetch recent chat history for context (last 20 messages)
  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const messages = history
    .reverse()
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Get AI adapter for user (respects user's provider config)
  const adapter = await getAdapterForUser(userId);
  const assistantText = await adapter.sendMessage(systemPrompt, messages);

  // Save assistant response
  const saved = await prisma.chatMessage.create({
    data: { userId, role: 'assistant', content: assistantText },
  });

  // Log metric
  await prisma.systemMetric.create({
    data: {
      key: 'chat_message',
      value: userId,
      metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
    },
  });

  return saved;
}

export async function getHistory(userId: string) {
  return prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function clearHistory(userId: string) {
  await prisma.chatMessage.deleteMany({ where: { userId } });
}
