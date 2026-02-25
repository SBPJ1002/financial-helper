import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const BASE_URL = 'https://www.alphavantage.co/query';
const DAILY_LIMIT = 25;

// In-memory cache with TTL
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

async function logApiCall() {
  await prisma.systemMetric.create({
    data: {
      key: 'av_api_call',
      value: '1',
      metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
    },
  });
}

async function avFetch(params: Record<string, string>): Promise<any> {
  if (!env.ALPHA_VANTAGE_API_KEY) {
    throw new Error('Alpha Vantage API key not configured');
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', env.ALPHA_VANTAGE_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const cacheKey = url.toString();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Alpha Vantage API error: ${res.status}`);

  const data = await res.json();

  if (data['Note'] || data['Information']) {
    throw new Error('Alpha Vantage API rate limit reached');
  }

  setCache(cacheKey, data);
  await logApiCall();

  return data;
}

export function isAlphaVantageEnabled(): boolean {
  return !!env.ALPHA_VANTAGE_API_KEY;
}

export async function getStockQuote(symbol: string) {
  // Append .SAO for Brazilian stocks if no suffix
  const avSymbol = /\d$/.test(symbol) && !symbol.includes('.') ? `${symbol}.SAO` : symbol;

  const data = await avFetch({
    function: 'GLOBAL_QUOTE',
    symbol: avSymbol,
  });

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) return null;

  return {
    symbol,
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: quote['10. change percent'],
    volume: parseInt(quote['06. volume']),
    latestTradingDay: quote['07. latest trading day'],
  };
}

export async function getStockHistory(symbol: string, outputSize: 'compact' | 'full' = 'compact') {
  const avSymbol = /\d$/.test(symbol) && !symbol.includes('.') ? `${symbol}.SAO` : symbol;

  const data = await avFetch({
    function: 'TIME_SERIES_DAILY',
    symbol: avSymbol,
    outputsize: outputSize,
  });

  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) return [];

  return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
    date,
    open: parseFloat(values['1. open']),
    high: parseFloat(values['2. high']),
    low: parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
    volume: parseInt(values['5. volume']),
  }));
}

export async function searchSymbol(keywords: string) {
  const data = await avFetch({
    function: 'SYMBOL_SEARCH',
    keywords,
  });

  const matches = data['bestMatches'];
  if (!matches) return [];

  return matches.map((m: any) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
    region: m['4. region'],
    currency: m['8. currency'],
  }));
}

export async function getCryptoQuote(symbol: string, market = 'BRL') {
  const data = await avFetch({
    function: 'CURRENCY_EXCHANGE_RATE',
    from_currency: symbol,
    to_currency: market,
  });

  const rate = data['Realtime Currency Exchange Rate'];
  if (!rate) return null;

  return {
    symbol,
    price: parseFloat(rate['5. Exchange Rate']),
    lastRefreshed: rate['6. Last Refreshed'],
  };
}

export async function getDailyQuota() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await prisma.systemMetric.count({
    where: {
      key: 'av_api_call',
      createdAt: { gte: todayStart },
    },
  });

  return { used: count, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) };
}

export async function updatePortfolioPrices() {
  const quota = await getDailyQuota();
  if (quota.remaining <= 0) {
    console.log('Alpha Vantage daily quota exhausted');
    return { updated: 0 };
  }

  // Get active assets that have investments
  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      investments: { some: { status: 'ACTIVE' } },
    },
    include: { _count: { select: { investments: true } } },
    orderBy: { updatedAt: 'asc' },
    take: quota.remaining,
  });

  let updated = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const asset of assets) {
    try {
      const quote = asset.type === 'CRYPTO'
        ? await getCryptoQuote(asset.ticker)
        : await getStockQuote(asset.ticker);

      if (quote && quote.price > 0) {
        await prisma.assetPrice.upsert({
          where: { assetId_date: { assetId: asset.id, date: today } },
          update: { price: quote.price, source: 'ALPHA_VANTAGE' },
          create: { assetId: asset.id, price: quote.price, date: today, source: 'ALPHA_VANTAGE' },
        });
        updated++;
      }

      // Check quota
      const currentQuota = await getDailyQuota();
      if (currentQuota.remaining <= 0) break;
    } catch (err) {
      console.error(`Failed to update ${asset.ticker}:`, err);
    }
  }

  return { updated };
}
