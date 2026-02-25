import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { parseYieldDescription, calculateCurrentValue } from './yieldCalculator.service.js';
import * as assetService from './asset.service.js';
import type { CreateInvestmentInput, UpdateInvestmentInput } from '../validators/investment.validator.js';

export async function list(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { investmentType: true, asset: true },
    orderBy: { applicationDate: 'desc' },
  });

  // Calculate current values for active investments
  const enriched = await Promise.all(
    investments.map(async (inv) => {
      let currentValue = inv.currentValue;

      if (inv.status === 'ACTIVE') {
        // Pluggy-imported investments already have accurate values from the institution
        if (inv.pluggyInvestmentId) {
          // Keep currentValue as-is from Pluggy sync
        } else if (inv.assetId && inv.quantity) {
          // Variable income — use latest asset price
          const latestPrice = await assetService.getLatestPrice(inv.assetId);
          if (latestPrice) {
            currentValue = Math.round(inv.quantity * latestPrice * 100) / 100;
          }
        } else {
          // Fixed income — use yield calculator
          currentValue = await calculateCurrentValue(
            inv.amountInvested,
            inv.applicationDate,
            inv.yieldType,
            inv.yieldRate,
          );
        }
      }

      return { ...inv, currentValue };
    }),
  );

  return enriched;
}

export async function getById(userId: string, id: string) {
  const inv = await prisma.investment.findFirst({
    where: { id, userId },
    include: {
      investmentType: true,
      asset: { include: { priceHistory: { orderBy: { date: 'desc' }, take: 30 } } },
      snapshots: { orderBy: { month: 'asc' } },
    },
  });
  if (!inv) throw ApiError.notFound('Investment not found');

  if (inv.status === 'ACTIVE') {
    // Pluggy-imported investments already have accurate values from the institution
    if (inv.pluggyInvestmentId) {
      // Keep currentValue as-is from Pluggy sync
    } else if (inv.assetId && inv.quantity) {
      const latestPrice = await assetService.getLatestPrice(inv.assetId);
      if (latestPrice) {
        inv.currentValue = Math.round(inv.quantity * latestPrice * 100) / 100;
      }
    } else {
      inv.currentValue = await calculateCurrentValue(
        inv.amountInvested,
        inv.applicationDate,
        inv.yieldType,
        inv.yieldRate,
      );
    }
  }

  return inv;
}

export async function create(userId: string, data: CreateInvestmentInput) {
  // Verify investment type exists
  const investmentType = await prisma.investmentType.findUnique({
    where: { id: data.investmentTypeId },
  });
  if (!investmentType) throw ApiError.badRequest('Invalid investment type');

  const parsed = parseYieldDescription(data.yieldDescription);

  const createData: Record<string, unknown> = {
    userId,
    name: data.name,
    investmentTypeId: data.investmentTypeId,
    amountInvested: data.amountInvested,
    applicationDate: new Date(data.applicationDate),
    maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
    yieldDescription: data.yieldDescription,
    yieldType: parsed.type,
    yieldRate: parsed.rate,
    institution: data.institution,
    status: data.status,
  };

  // Variable income fields
  if (data.assetId) createData.assetId = data.assetId;
  if (data.quantity !== undefined) createData.quantity = data.quantity;
  if (data.averagePrice !== undefined) createData.averagePrice = data.averagePrice;
  if (data.purchaseDate) createData.purchaseDate = new Date(data.purchaseDate);

  // Treasury fields
  if (data.treasuryTitle) createData.treasuryTitle = data.treasuryTitle;
  if (data.treasuryRate !== undefined) createData.treasuryRate = data.treasuryRate;
  if (data.treasuryIndex) createData.treasuryIndex = data.treasuryIndex;

  return prisma.investment.create({
    data: createData as any,
    include: { investmentType: true, asset: true },
  });
}

export async function update(userId: string, id: string, data: UpdateInvestmentInput) {
  const inv = await prisma.investment.findFirst({ where: { id, userId } });
  if (!inv) throw ApiError.notFound('Investment not found');

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.investmentTypeId !== undefined) {
    const type = await prisma.investmentType.findUnique({ where: { id: data.investmentTypeId } });
    if (!type) throw ApiError.badRequest('Invalid investment type');
    updateData.investmentTypeId = data.investmentTypeId;
  }
  if (data.amountInvested !== undefined) updateData.amountInvested = data.amountInvested;
  if (data.applicationDate !== undefined) updateData.applicationDate = new Date(data.applicationDate);
  if (data.maturityDate !== undefined) updateData.maturityDate = new Date(data.maturityDate);
  if (data.institution !== undefined) updateData.institution = data.institution;
  if (data.status !== undefined) updateData.status = data.status;

  if (data.yieldDescription !== undefined) {
    const parsed = parseYieldDescription(data.yieldDescription);
    updateData.yieldDescription = data.yieldDescription;
    updateData.yieldType = parsed.type;
    updateData.yieldRate = parsed.rate;
  }

  // Variable income fields
  if (data.assetId !== undefined) updateData.assetId = data.assetId || null;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.averagePrice !== undefined) updateData.averagePrice = data.averagePrice;
  if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;

  // Treasury fields
  if (data.treasuryTitle !== undefined) updateData.treasuryTitle = data.treasuryTitle;
  if (data.treasuryRate !== undefined) updateData.treasuryRate = data.treasuryRate;
  if (data.treasuryIndex !== undefined) updateData.treasuryIndex = data.treasuryIndex;

  return prisma.investment.update({
    where: { id },
    data: updateData,
    include: { investmentType: true, asset: true },
  });
}

export async function remove(userId: string, id: string) {
  const inv = await prisma.investment.findFirst({ where: { id, userId } });
  if (!inv) throw ApiError.notFound('Investment not found');

  await prisma.investment.delete({ where: { id } });
}

export async function getSummary(userId: string) {
  const investments = await list(userId);

  const totalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);
  const totalCurrent = investments.reduce((s, i) => s + (i.currentValue ?? i.amountInvested), 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const byCategory = investments.reduce(
    (acc, inv) => {
      const cat = inv.investmentType.category;
      if (!acc[cat]) acc[cat] = { invested: 0, current: 0, count: 0 };
      acc[cat].invested += inv.amountInvested;
      acc[cat].current += inv.currentValue ?? inv.amountInvested;
      acc[cat].count++;
      return acc;
    },
    {} as Record<string, { invested: number; current: number; count: number }>,
  );

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    byCategory,
    count: investments.length,
  };
}

export async function getInvestmentTypes() {
  return prisma.investmentType.findMany({ orderBy: { name: 'asc' } });
}
