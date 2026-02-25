import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export async function searchAssets(query: string, type?: string) {
  const where: Record<string, unknown> = { isActive: true };

  if (query) {
    where.OR = [
      { ticker: { contains: query.toUpperCase(), mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (type) {
    where.type = type;
  }

  return prisma.asset.findMany({
    where,
    orderBy: { ticker: 'asc' },
    take: 20,
    include: {
      priceHistory: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });
}

export async function getAssetById(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      priceHistory: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });
  if (!asset) throw ApiError.notFound('Asset not found');
  return asset;
}

export async function getAssetByTicker(ticker: string) {
  return prisma.asset.findUnique({
    where: { ticker: ticker.toUpperCase() },
    include: {
      priceHistory: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });
}

export async function getLatestPrice(assetId: string): Promise<number | null> {
  const price = await prisma.assetPrice.findFirst({
    where: { assetId },
    orderBy: { date: 'desc' },
  });
  return price?.price ?? null;
}

export async function updateAssetPrice(assetId: string, price: number, source = 'USER_UPDATE') {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw ApiError.notFound('Asset not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.assetPrice.upsert({
    where: { assetId_date: { assetId, date: today } },
    update: { price, source },
    create: { assetId, price, date: today, source },
  });
}

export async function updateMultiplePrices(
  updates: Array<{ assetId: string; price: number }>,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  for (const u of updates) {
    const result = await prisma.assetPrice.upsert({
      where: { assetId_date: { assetId: u.assetId, date: today } },
      update: { price: u.price, source: 'USER_UPDATE' },
      create: { assetId: u.assetId, price: u.price, date: today, source: 'USER_UPDATE' },
    });
    results.push(result);
  }

  return results;
}

export async function createAsset(data: {
  ticker: string;
  name: string;
  type: 'STOCK' | 'FII' | 'ETF' | 'BDR' | 'CRYPTO';
  sector?: string;
}) {
  const existing = await prisma.asset.findUnique({ where: { ticker: data.ticker.toUpperCase() } });
  if (existing) throw ApiError.badRequest('Asset with this ticker already exists');

  return prisma.asset.create({
    data: {
      ticker: data.ticker.toUpperCase(),
      name: data.name,
      type: data.type,
      sector: data.sector,
    },
  });
}
