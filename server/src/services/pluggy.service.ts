import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const PLUGGY_API_URL = 'https://api.pluggy.ai';

let accessToken: string | null = null;
let tokenExpiresAt = 0;

export function isPluggyEnabled(): boolean {
  return !!(env.PLUGGY_CLIENT_ID && env.PLUGGY_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const res = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: env.PLUGGY_CLIENT_ID,
      clientSecret: env.PLUGGY_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Pluggy auth failed: ${res.status}`);

  const data = await res.json();
  accessToken = data.apiKey;
  // Cache for 2 hours
  tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;

  return accessToken!;
}

async function pluggyFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${PLUGGY_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': token,
      ...options.headers,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pluggy API error ${res.status}: ${body}`);
  }

  return res.json();
}

export async function createConnectToken(userId: string): Promise<string> {
  const data = await pluggyFetch('/connect_token', {
    method: 'POST',
    body: JSON.stringify({ clientUserId: userId }),
  });
  return data.accessToken;
}

// --- Pluggy Investment Type Mapping ---

interface PluggyInvestment {
  id: string;
  name: string;
  type: string;       // FIXED_INCOME, MUTUAL_FUND, EQUITY, SECURITY, ETF, COE, OTHER
  subtype: string | null; // TREASURY, CDB, LCI, LCA, STOCK, etc.
  balance: number;
  amount: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  rate: number | null;
  rateType: string | null;     // SELIC, CDI, IPCA, etc.
  fixedAnnualRate: number | null;
  dueDate: string | null;
  issuer: string | null;
  issueDate: string | null;
  purchaseDate: string | null;
  status: string | null;       // ACTIVE, PENDING, TOTAL_WITHDRAWAL
  code: string | null;
  isin: string | null;
  currencyCode: string;
  date: string | null;
  value: number | null;
  quantity: number | null;
  lastMonthRate: number | null;
  annualRate: number | null;
  lastTwelveMonthsRate: number | null;
  institution: { name: string; number?: string } | null;
}

/** Map Pluggy subtype → our InvestmentType name */
function mapPluggySubtype(type: string, subtype: string | null, name: string): string {
  // Treasury bonds: detect specific type from name
  if (subtype === 'TREASURY' || type === 'FIXED_INCOME' && /TESOURO|LFT|LTN|NTN/i.test(name)) {
    if (/SELIC|LFT/i.test(name)) return 'Treasury Selic';
    if (/IPCA|NTN[\s-]?B(?!1)/i.test(name)) return 'Treasury IPCA+';
    if (/PREFIXADO|LTN|NTN[\s-]?F/i.test(name)) return 'Treasury Prefixed';
    if (/RENDA\+?/i.test(name)) return 'Treasury Renda+';
    if (/EDUCA\+?/i.test(name)) return 'Treasury Educa+';
    return 'Treasury Selic'; // default treasury
  }

  // Direct subtype mapping
  switch (subtype) {
    case 'CDB': return 'CDB';
    case 'LCI': return 'LCI';
    case 'LCA': return 'LCA';
    case 'CRI': return 'CRI';
    case 'CRA': return 'CRA';
    case 'DEBENTURES':
    case 'CORPORATE_DEBT': return 'Debentures';
    case 'LC': return 'CDB'; // Letra de Câmbio → treat like CDB
    case 'STRUCTURED_NOTE': return 'COE';
    case 'RETIREMENT': return 'Private Pension';
    // Mutual funds subtypes
    case 'INVESTMENT_FUND':
    case 'MULTIMARKET_FUND':
    case 'FIXED_INCOME_FUND':
    case 'STOCK_FUND':
    case 'ETF_FUND':
    case 'OFFSHORE_FUND':
    case 'FIP_FUND':
    case 'EXCHANGE_FUND':
    case 'FI_INFRA':
    case 'FI_AGRO': return 'Investment Funds';
    // Equity subtypes
    case 'STOCK': return 'Stocks';
    case 'ETF': return 'ETF';
    case 'REAL_ESTATE_FUND': return 'FII';
    case 'BDR': return 'BDR';
    case 'DERIVATIVES':
    case 'OPTION': return 'Derivatives';
    default: break;
  }

  // Fallback by top-level type
  switch (type) {
    case 'FIXED_INCOME': return 'CDB';
    case 'MUTUAL_FUND': return 'Investment Funds';
    case 'EQUITY': return 'Stocks';
    case 'SECURITY': return 'Private Pension';
    case 'ETF': return 'ETF';
    case 'COE': return 'COE';
    default: return 'Other';
  }
}

/** Map Pluggy rateType → our YieldType enum + build yield description */
function mapPluggyYield(inv: PluggyInvestment, typeName: string): {
  yieldType: string;
  yieldRate: number | null;
  yieldDescription: string;
  treasuryTitle?: string;
  treasuryIndex?: string;
} {
  const rate = inv.rate;
  const fixedRate = inv.fixedAnnualRate;

  // Treasury-specific fields
  const isTreasury = typeName.startsWith('Treasury');
  const treasuryTitle = isTreasury ? typeName.replace('Treasury ', 'Tesouro ') : undefined;

  switch (inv.rateType) {
    case 'SELIC':
      return {
        yieldType: 'SELIC',
        yieldRate: rate,
        yieldDescription: rate ? `SELIC + ${rate}%` : 'SELIC',
        treasuryTitle,
        treasuryIndex: 'SELIC',
      };
    case 'CDI':
      return {
        yieldType: 'CDI_PERCENTAGE',
        yieldRate: rate ?? 100,
        yieldDescription: `${rate ?? 100}% CDI`,
      };
    case 'IPCA':
      return {
        yieldType: 'IPCA_PLUS',
        yieldRate: fixedRate ?? rate ?? 6,
        yieldDescription: `IPCA + ${fixedRate ?? rate ?? 6}%`,
        treasuryTitle,
        treasuryIndex: 'IPCA',
      };
    default:
      // If has a fixed annual rate, treat as prefixed
      if (fixedRate) {
        return {
          yieldType: 'PREFIXED',
          yieldRate: fixedRate,
          yieldDescription: `${fixedRate}% a.a.`,
          treasuryTitle,
        };
      }
      // Fallback based on our known type defaults
      if (typeName === 'Savings') {
        return { yieldType: 'POUPANCA', yieldRate: null, yieldDescription: 'POUPANCA' };
      }
      if (isTreasury && /Selic/i.test(typeName)) {
        return { yieldType: 'SELIC', yieldRate: null, yieldDescription: 'SELIC', treasuryTitle, treasuryIndex: 'SELIC' };
      }
      if (isTreasury && /IPCA/i.test(typeName)) {
        return { yieldType: 'IPCA_PLUS', yieldRate: 6, yieldDescription: 'IPCA + 6%', treasuryTitle, treasuryIndex: 'IPCA' };
      }
      if (['Stocks', 'FII', 'ETF', 'BDR', 'Derivatives'].includes(typeName)) {
        return { yieldType: 'VARIABLE', yieldRate: null, yieldDescription: 'Variable' };
      }
      return { yieldType: 'CDI_PERCENTAGE', yieldRate: 100, yieldDescription: '100% CDI' };
  }
}

/** Map our type name to InvestmentCategory enum */
function getInvestmentCategory(typeName: string): 'FIXED_INCOME' | 'VARIABLE_INCOME' | 'OTHER' {
  if (typeName.startsWith('Treasury') || ['CDB', 'LCI', 'LCA', 'CRI', 'CRA', 'Debentures', 'COE', 'Savings'].includes(typeName)) {
    return 'FIXED_INCOME';
  }
  if (['Stocks', 'FII', 'ETF', 'BDR', 'Derivatives'].includes(typeName)) {
    return 'VARIABLE_INCOME';
  }
  return 'OTHER';
}

export interface SyncResult {
  investments: { synced: number; skipped: number };
  transactions: { synced: number; newCount: number };
  accounts: number;
}

/**
 * Request Pluggy to refresh data from the financial institution,
 * then poll until the item status is no longer UPDATING.
 */
async function refreshPluggyItem(pluggyItemId: string): Promise<void> {
  // Trigger update at Pluggy
  await pluggyFetch(`/items/${pluggyItemId}`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

  // Poll until update completes (max ~60s)
  const maxAttempts = 20;
  const delayMs = 3000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    const item = await pluggyFetch(`/items/${pluggyItemId}`);
    if (item.status !== 'UPDATING') {
      if (item.status === 'UPDATE_ERROR') {
        console.warn(`Pluggy item ${pluggyItemId} update failed: ${item.error?.message || 'unknown'}`);
      }
      return;
    }
  }
  console.warn(`Pluggy item ${pluggyItemId} still updating after polling — proceeding with stale data`);
}

export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    include: { accounts: true },
  });

  if (!connection) throw new Error('Connection not found');

  // --- Ask Pluggy to refresh data from the institution ---
  await refreshPluggyItem(connection.pluggyItemId);

  // --- Sync Investments from Pluggy /investments endpoint ---
  const investmentResult = await syncInvestments(connection.pluggyItemId, connection.userId, connection.connectorName);

  // --- Sync Accounts & Transactions ---
  const accountsData = await pluggyFetch(`/accounts?itemId=${connection.pluggyItemId}`);
  const accounts = accountsData.results || [];
  let txSynced = 0;
  let txNew = 0;

  for (const acc of accounts) {
    const bankAccount = await prisma.bankAccount.upsert({
      where: { pluggyAccountId: acc.id },
      update: {
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        currencyCode: acc.currencyCode || 'BRL',
      },
      create: {
        bankConnectionId: connection.id,
        pluggyAccountId: acc.id,
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        currencyCode: acc.currencyCode || 'BRL',
      },
    });

    // Fetch transactions for this account (last 90 days) with pagination
    const since = new Date();
    since.setDate(since.getDate() - 90);
    let txPage = 1;
    let txTotalPages = 1;

    while (txPage <= txTotalPages) {
      const txData = await pluggyFetch(
        `/transactions?accountId=${acc.id}&from=${since.toISOString().split('T')[0]}&page=${txPage}`
      );
      txTotalPages = txData.totalPages || 1;
      const transactions = txData.results || [];

      for (const tx of transactions) {
        const installmentNumber = tx.creditCardMetadata?.installmentNumber ?? null;
        const totalInstallments = tx.creditCardMetadata?.totalInstallments ?? null;
        const operationType = tx.operationType ?? null;

        // Generate a group ID for installment purchases (same description + total amount)
        let installmentGroupId: string | null = null;
        if (totalInstallments && totalInstallments > 1) {
          const normalized = (tx.description || '').toLowerCase().replace(/\s+/g, '_');
          const totalAmount = Math.abs(tx.amount * totalInstallments).toFixed(2);
          installmentGroupId = `${bankAccount.id}_${normalized}_${totalAmount}_${totalInstallments}x`;
        }

        // Check if this transaction already exists
        const existing = await prisma.bankTransaction.findUnique({
          where: { pluggyTxId: tx.id },
          select: { id: true },
        });

        await prisma.bankTransaction.upsert({
          where: { pluggyTxId: tx.id },
          update: {
            description: tx.description || 'No description',
            amount: tx.amount,
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category || null,
            operationType,
            installmentNumber,
            totalInstallments,
            installmentGroupId,
          },
          create: {
            bankAccountId: bankAccount.id,
            pluggyTxId: tx.id,
            description: tx.description || 'No description',
            amount: tx.amount,
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category || null,
            operationType,
            installmentNumber,
            totalInstallments,
            installmentGroupId,
          },
        });

        txSynced++;
        if (!existing) txNew++;
      }

      txPage++;
    }
  }

  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date(), status: 'ACTIVE' },
  });

  return {
    investments: investmentResult,
    transactions: { synced: txSynced, newCount: txNew },
    accounts: accounts.length,
  };
}

/**
 * Sync investments from Pluggy's /investments endpoint.
 * This gets the full portfolio snapshot (not transactions).
 */
async function syncInvestments(
  pluggyItemId: string,
  userId: string,
  connectorName: string,
): Promise<{ synced: number; skipped: number }> {
  let page = 1;
  let totalPages = 1;
  let synced = 0;
  let skipped = 0;

  // Pre-load investment types for mapping
  const investmentTypes = await prisma.investmentType.findMany();
  const typeByName = new Map(investmentTypes.map(t => [t.name, t.id]));

  while (page <= totalPages) {
    const data = await pluggyFetch(`/investments?itemId=${pluggyItemId}&page=${page}`);
    totalPages = data.totalPages || 1;
    const investments: PluggyInvestment[] = data.results || [];

    for (const inv of investments) {
      try {
        // Skip fully withdrawn investments
        if (inv.status === 'TOTAL_WITHDRAWAL') {
          skipped++;
          continue;
        }

        // Map Pluggy type → our InvestmentType name
        const typeName = mapPluggySubtype(inv.type, inv.subtype, inv.name);

        // Ensure InvestmentType exists (auto-create if not)
        let typeId = typeByName.get(typeName);
        if (!typeId) {
          const category = getInvestmentCategory(typeName);
          const created = await prisma.investmentType.upsert({
            where: { name: typeName },
            update: {},
            create: { name: typeName, category, isDefault: true },
          });
          typeId = created.id;
          typeByName.set(typeName, typeId);
        }

        // Map yield info from Pluggy's rate data
        const yieldInfo = mapPluggyYield(inv, typeName);

        // Determine dates
        const appDate = inv.purchaseDate || inv.issueDate || inv.date || new Date().toISOString();
        const maturityDate = inv.dueDate ? new Date(inv.dueDate) : null;

        // Variable income fields (stocks, FIIs, ETFs, BDRs)
        const isVariableIncome = ['Stocks', 'FII', 'ETF', 'BDR', 'Derivatives'].includes(typeName);
        const quantity = isVariableIncome ? inv.quantity : null;
        const averagePrice = isVariableIncome && inv.quantity && inv.amountOriginal
          ? inv.amountOriginal / inv.quantity
          : null;

        // Calculate amountInvested: prefer amountOriginal, then derive from balance - profit
        const amountInvested = inv.amountOriginal
          ?? (inv.amountProfit != null ? inv.balance - inv.amountProfit : null)
          ?? inv.amount
          ?? Math.abs(inv.balance);

        // Upsert by pluggyInvestmentId (dedup)
        await prisma.investment.upsert({
          where: { pluggyInvestmentId: inv.id },
          update: {
            name: inv.name,
            investmentTypeId: typeId,
            amountInvested,
            currentValue: inv.balance,
            maturityDate,
            yieldDescription: yieldInfo.yieldDescription,
            yieldType: yieldInfo.yieldType as any,
            yieldRate: yieldInfo.yieldRate,
            institution: inv.institution?.name || connectorName,
            status: inv.status === 'ACTIVE' ? 'ACTIVE' : 'ACTIVE',
            quantity,
            averagePrice,
            treasuryTitle: yieldInfo.treasuryTitle,
            treasuryIndex: yieldInfo.treasuryIndex,
            amountProfit: inv.amountProfit,
            lastMonthRate: inv.lastMonthRate,
            annualRate: inv.annualRate,
          },
          create: {
            userId,
            pluggyInvestmentId: inv.id,
            name: inv.name,
            investmentTypeId: typeId,
            amountInvested,
            currentValue: inv.balance,
            applicationDate: new Date(appDate),
            maturityDate,
            yieldDescription: yieldInfo.yieldDescription,
            yieldType: yieldInfo.yieldType as any,
            yieldRate: yieldInfo.yieldRate,
            institution: inv.institution?.name || connectorName,
            status: 'ACTIVE',
            quantity,
            averagePrice,
            treasuryTitle: yieldInfo.treasuryTitle,
            treasuryIndex: yieldInfo.treasuryIndex,
            amountProfit: inv.amountProfit,
            lastMonthRate: inv.lastMonthRate,
            annualRate: inv.annualRate,
          },
        });

        synced++;
      } catch (err: any) {
        console.error(`Failed to sync investment ${inv.id} (${inv.name}):`, err.message);
        skipped++;
      }
    }

    page++;
  }

  console.log(`Investments synced: ${synced}, skipped: ${skipped}`);
  return { synced, skipped };
}

export async function syncAllConnections(): Promise<void> {
  if (!isPluggyEnabled()) return;

  const connections = await prisma.bankConnection.findMany({
    where: { status: 'ACTIVE' },
  });

  for (const conn of connections) {
    try {
      await syncConnection(conn.id);
      console.log(`Synced connection: ${conn.connectorName}`);
    } catch (err) {
      console.error(`Failed to sync connection ${conn.id}:`, err);
      await prisma.bankConnection.update({
        where: { id: conn.id },
        data: { status: 'ERROR' },
      });
    }
  }

  await prisma.systemMetric.create({
    data: {
      key: 'pluggy_sync',
      value: String(connections.length),
      metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
    },
  });
}
