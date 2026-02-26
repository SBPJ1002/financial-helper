import { prisma } from '../config/prisma.js';
import type { UpdateProfileInput } from '../validators/onboarding.validator.js';

export async function getProfile(userId: string) {
  let profile = await prisma.userFinancialProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.userFinancialProfile.create({
      data: { userId },
    });
  }

  return profile;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const { onboardingStepReached, ...rest } = data;

  // Never recede step
  let stepUpdate: number | undefined;
  if (onboardingStepReached !== undefined) {
    const current = await prisma.userFinancialProfile.findUnique({
      where: { userId },
      select: { onboardingStepReached: true },
    });
    if (!current || onboardingStepReached > current.onboardingStepReached) {
      stepUpdate = onboardingStepReached;
    }
  }

  return prisma.userFinancialProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...rest,
      onboardingStepReached: stepUpdate ?? 0,
    },
    update: {
      ...rest,
      ...(stepUpdate !== undefined ? { onboardingStepReached: stepUpdate } : {}),
    },
  });
}

export async function completeOnboarding(userId: string) {
  return prisma.userFinancialProfile.upsert({
    where: { userId },
    create: {
      userId,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
    update: {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  });
}
