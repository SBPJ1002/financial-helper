import { prisma } from '../config/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export async function getSettings(userId: string) {
  let settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId },
    });
  }

  // Never expose the raw encrypted key
  const hasApiKey = !!settings.aiApiKey;
  return {
    ...settings,
    aiApiKey: hasApiKey ? '••••••••' : null,
    hasAiApiKey: hasApiKey,
  };
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
    'aiProvider', 'aiModel', 'theme', 'accentColor', 'language',
    'fontSize', 'currency', 'dateFormat', 'startDayOfMonth',
    'alertExpenseAbove', 'alertInvestmentDrop', 'alertBillDue',
    'aiIncludeInvestments', 'aiIncludeExpenses',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  // Handle API key separately (encrypt)
  if (data.aiApiKey !== undefined) {
    const key = data.aiApiKey as string;
    if (key && key !== '••••••••') {
      updateData.aiApiKey = encrypt(key);
    } else if (key === '') {
      updateData.aiApiKey = null;
    }
    // If '••••••••', don't update (user didn't change it)
  }

  return prisma.userSettings.update({
    where: { userId },
    data: updateData,
  });
}

export async function getDecryptedApiKey(userId: string): Promise<string | null> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.aiApiKey) return null;

  try {
    return decrypt(settings.aiApiKey);
  } catch {
    return null;
  }
}
