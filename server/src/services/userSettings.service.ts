import { prisma } from '../config/prisma.js';

export async function getSettings(userId: string) {
  let settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId },
    });
  }

  return settings;
}

export async function updateSettings(
  userId: string,
  data: Record<string, unknown>,
) {
  // Ensure user settings record exists
  await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const updateData: Record<string, unknown> = {};

  // Whitelist of allowed fields
  const allowedFields = [
    'theme', 'accentColor', 'language',
    'fontSize', 'currency', 'dateFormat', 'startDayOfMonth',
    'alertExpenseAbove', 'alertInvestmentDrop', 'alertBillDue',
    'aiIncludeExpenses',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  return prisma.userSettings.update({
    where: { userId },
    data: updateData,
  });
}
