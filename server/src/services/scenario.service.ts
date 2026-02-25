import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

interface ScenarioInput {
  name: string;
  initialAmount: number;
  monthlyDeposit: number;
  annualRate: number;
  periodMonths: number;
  interestType: string;
  referenceIndex?: string;
}

function calculate(data: ScenarioInput) {
  const monthlyRate = data.annualRate / 100 / 12;
  let total = data.initialAmount;
  let totalInvested = data.initialAmount;

  for (let m = 1; m <= data.periodMonths; m++) {
    if (data.interestType === 'COMPOUND') {
      total = total * (1 + monthlyRate) + data.monthlyDeposit;
    } else {
      total = total + data.initialAmount * monthlyRate + data.monthlyDeposit;
    }
    totalInvested += data.monthlyDeposit;
  }

  return {
    totalAmount: Math.round(total * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalYield: Math.round((total - totalInvested) * 100) / 100,
  };
}

export async function list(userId: string) {
  return prisma.simulationScenario.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(userId: string, id: string) {
  const scenario = await prisma.simulationScenario.findFirst({
    where: { id, userId },
  });
  if (!scenario) throw ApiError.notFound('Scenario not found');
  return scenario;
}

export async function create(userId: string, data: ScenarioInput) {
  const computed = calculate(data);

  return prisma.simulationScenario.create({
    data: {
      userId,
      name: data.name,
      initialAmount: data.initialAmount,
      monthlyDeposit: data.monthlyDeposit,
      annualRate: data.annualRate,
      periodMonths: data.periodMonths,
      interestType: data.interestType,
      referenceIndex: data.referenceIndex,
      ...computed,
    },
  });
}

export async function update(userId: string, id: string, data: Partial<ScenarioInput>) {
  const existing = await prisma.simulationScenario.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('Scenario not found');

  const merged = {
    name: data.name ?? existing.name,
    initialAmount: data.initialAmount ?? existing.initialAmount,
    monthlyDeposit: data.monthlyDeposit ?? existing.monthlyDeposit,
    annualRate: data.annualRate ?? existing.annualRate,
    periodMonths: data.periodMonths ?? existing.periodMonths,
    interestType: data.interestType ?? existing.interestType,
    referenceIndex: data.referenceIndex ?? existing.referenceIndex ?? undefined,
  };

  const computed = calculate(merged);

  return prisma.simulationScenario.update({
    where: { id },
    data: { ...merged, ...computed },
  });
}

export async function remove(userId: string, id: string) {
  const existing = await prisma.simulationScenario.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('Scenario not found');

  await prisma.simulationScenario.delete({ where: { id } });
}

export async function duplicate(userId: string, id: string) {
  const existing = await prisma.simulationScenario.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('Scenario not found');

  return prisma.simulationScenario.create({
    data: {
      userId,
      name: `${existing.name} (copy)`,
      initialAmount: existing.initialAmount,
      monthlyDeposit: existing.monthlyDeposit,
      annualRate: existing.annualRate,
      periodMonths: existing.periodMonths,
      interestType: existing.interestType,
      referenceIndex: existing.referenceIndex,
      totalAmount: existing.totalAmount,
      totalInvested: existing.totalInvested,
      totalYield: existing.totalYield,
    },
  });
}
