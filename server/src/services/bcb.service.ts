import { prisma } from '../config/prisma.js';

// BCB API series codes
const BCB_SERIES: Record<string, number> = {
  SELIC: 432,
  CDI: 12,
  IPCA: 13522,
  POUPANCA: 25,
  TR: 226,
  IGPM: 189,
  DOLAR: 1,
};

interface BcbDataPoint {
  data: string; // DD/MM/YYYY
  valor: string;
}

async function fetchBcbSeries(seriesCode: number, last = 1): Promise<BcbDataPoint[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/${last}?formato=json`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`BCB API error: ${response.status} for series ${seriesCode}`);
  }

  return response.json() as Promise<BcbDataPoint[]>;
}

function parseDate(dateStr: string): Date {
  // DD/MM/YYYY -> Date
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

export async function fetchAndStoreRates(): Promise<void> {
  console.log('Fetching BCB rates...');

  for (const [type, seriesCode] of Object.entries(BCB_SERIES)) {
    try {
      const data = await fetchBcbSeries(seriesCode);
      if (data.length === 0) continue;

      const latest = data[data.length - 1];
      const value = parseFloat(latest.valor);
      const date = parseDate(latest.data);
      date.setHours(0, 0, 0, 0);

      await prisma.economicRate.upsert({
        where: { type_date: { type, date } },
        update: { value },
        create: { type, value, date, source: 'BCB' },
      });

      console.log(`  ${type}: ${value}% (${latest.data})`);
    } catch (err) {
      console.error(`  Failed to fetch ${type}:`, err);
    }
  }

  // Log metric
  await prisma.systemMetric.create({
    data: {
      key: 'bcb_rate_fetch',
      value: 'success',
      metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
    },
  });
}

export async function getCurrentRates() {
  const rates: Record<string, { value: number; date: string }> = {};

  for (const type of Object.keys(BCB_SERIES)) {
    const latest = await prisma.economicRate.findFirst({
      where: { type },
      orderBy: { date: 'desc' },
    });

    if (latest) {
      rates[type] = {
        value: latest.value,
        date: latest.date.toISOString().split('T')[0],
      };
    }
  }

  return rates;
}

export async function getPublicRates() {
  const types = ['SELIC', 'CDI', 'IPCA', 'POUPANCA', 'DOLAR'];
  const result: Record<string, { value: number; date: string }> = {};

  for (const type of types) {
    const latest = await prisma.economicRate.findFirst({
      where: { type },
      orderBy: { date: 'desc' },
    });

    if (latest) {
      result[type.toLowerCase()] = {
        value: latest.value,
        date: latest.date.toISOString().split('T')[0],
      };
    }
  }

  const anyRate = Object.values(result)[0];
  return {
    ...result,
    lastUpdated: anyRate ? new Date().toISOString() : null,
  };
}

export async function getRateHistory(type: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.economicRate.findMany({
    where: { type, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { value: true, date: true },
  });
}
