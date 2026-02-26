import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { StandardizationPipeline } from './standardization/index.js';
import { ClassificationService } from './classification/index.js';

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

export interface SyncResult {
  transactions: { synced: number; newCount: number };
  accounts: number;
  warnings?: string[];
}

async function refreshPluggyItem(pluggyItemId: string): Promise<void> {
  const currentItem = await pluggyFetch(`/items/${pluggyItemId}`);

  if (currentItem.status === 'UPDATING') {
    console.log('Pluggy item already updating, waiting...');
  } else {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const statusDetail = currentItem.statusDetail || {};
    const recentlyUpdated = Object.values(statusDetail).some(
      (detail: any) => detail?.lastUpdatedAt && new Date(detail.lastUpdatedAt) > oneHourAgo
    );

    if (recentlyUpdated) {
      console.log('Pluggy item was recently updated, skipping refresh to preserve rate limits');
      return;
    }

    try {
      await pluggyFetch(`/items/${pluggyItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
    } catch (err: any) {
      console.warn(`Pluggy refresh request failed: ${err.message} — proceeding with cached data`);
      return;
    }
  }

  const maxAttempts = 20;
  const delayMs = 3000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    const item = await pluggyFetch(`/items/${pluggyItemId}`);
    if (item.status !== 'UPDATING') {
      if (item.status === 'UPDATE_ERROR') {
        console.warn(`Pluggy item ${pluggyItemId} update failed: ${item.error?.message || 'unknown'}`);
      }
      if (item.executionStatus === 'PARTIAL_SUCCESS') {
        const warnings: string[] = [];
        for (const [product, detail] of Object.entries(item.statusDetail || {})) {
          const d = detail as any;
          if (d?.warnings?.length > 0) {
            warnings.push(`${product}: ${d.warnings.map((w: any) => w.message).join('; ')}`);
          }
        }
        if (warnings.length > 0) {
          console.warn(`Pluggy partial success — ${warnings.join(' | ')}`);
        }
      }
      return;
    }
  }
  console.warn(`Pluggy item ${pluggyItemId} still updating after polling — proceeding with stale data`);
}

export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const connection = await prisma.pluggyItem.findUnique({
    where: { id: connectionId },
    include: { accounts: { include: { stdAccount: true } } },
  });

  if (!connection) throw new Error('Connection not found');

  const syncWarnings: string[] = [];

  // Ask Pluggy to refresh data from the institution
  await refreshPluggyItem(connection.pluggyItemId);

  // Check item status for warnings
  const itemStatus = await pluggyFetch(`/items/${connection.pluggyItemId}`);
  if (itemStatus.statusDetail) {
    for (const [product, detail] of Object.entries(itemStatus.statusDetail || {})) {
      const d = detail as any;
      if (d?.warnings?.length > 0) {
        for (const w of d.warnings) {
          syncWarnings.push(w.message || `${product}: warning`);
          console.warn(`Pluggy warning [${product}]:`, w.message);
        }
      }
    }
  }

  // Sync Accounts & Transactions (Raw Layer)
  const accountsData = await pluggyFetch(`/accounts?itemId=${connection.pluggyItemId}`);
  const accounts = accountsData.results || [];
  console.log(`Pluggy returned ${accounts.length} accounts (types: ${accounts.map((a: any) => a.type).join(', ') || 'none'})`);
  let txSynced = 0;
  let txNew = 0;

  for (const acc of accounts) {
    // Upsert raw PluggyAccount
    const pluggyAccount = await prisma.pluggyAccount.upsert({
      where: { pluggyAccountId: acc.id },
      update: {
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype || null,
        number: acc.number || null,
        balance: acc.balance || 0,
        currencyCode: acc.currencyCode || 'BRL',
        creditLimit: acc.creditData?.creditLimit || null,
        availableCreditLimit: acc.creditData?.availableCreditLimit || null,
        marketingName: acc.marketingName || null,
        rawJson: JSON.stringify(acc),
      },
      create: {
        pluggyItemId: connection.id,
        pluggyAccountId: acc.id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype || null,
        number: acc.number || null,
        balance: acc.balance || 0,
        currencyCode: acc.currencyCode || 'BRL',
        creditLimit: acc.creditData?.creditLimit || null,
        availableCreditLimit: acc.creditData?.availableCreditLimit || null,
        marketingName: acc.marketingName || null,
        rawJson: JSON.stringify(acc),
      },
    });

    // Ensure StdAccount exists
    const sourceType = acc.type === 'CREDIT' ? 'CREDIT' : acc.type === 'INVESTMENT' ? 'INVESTMENT' : 'BANK';
    await prisma.stdAccount.upsert({
      where: { pluggyAccountId: pluggyAccount.pluggyAccountId },
      update: {
        bankName: connection.connectorName,
        accountLabel: acc.name,
        currentBalance: acc.balance || 0,
        currencyCode: acc.currencyCode || 'BRL',
        creditLimit: acc.creditData?.creditLimit || null,
        sourceType: sourceType as any,
      },
      create: {
        pluggyAccountId: pluggyAccount.pluggyAccountId,
        userId: connection.userId,
        sourceType: sourceType as any,
        bankName: connection.connectorName,
        accountLabel: acc.name,
        currentBalance: acc.balance || 0,
        currencyCode: acc.currencyCode || 'BRL',
        creditLimit: acc.creditData?.creditLimit || null,
        accountNumberMasked: acc.number ? `****${acc.number.slice(-4)}` : null,
      },
    });

    // Fetch transactions (last 90 days) with pagination
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
        // Check if this transaction already exists
        const existing = await prisma.pluggyTransaction.findUnique({
          where: { pluggyTxId: tx.id },
          select: { id: true },
        });

        // Upsert raw PluggyTransaction (store ALL fields)
        await prisma.pluggyTransaction.upsert({
          where: { pluggyTxId: tx.id },
          update: {
            description: tx.description || 'No description',
            descriptionRaw: tx.descriptionRaw || null,
            amount: tx.amount,
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category || null,
            categoryId: tx.categoryId || null,
            operationType: tx.operationType || null,
            currencyCode: tx.currencyCode || 'BRL',
            installmentNumber: tx.creditCardMetadata?.installmentNumber ?? null,
            totalInstallments: tx.creditCardMetadata?.totalInstallments ?? null,
            cardNumber: tx.creditCardMetadata?.cardNumber ?? null,
            billDate: tx.creditCardMetadata?.billDate ? new Date(tx.creditCardMetadata.billDate) : null,
            payerName: tx.payer?.name || null,
            payerDocType: tx.payer?.documentNumber?.type || null,
            payerDocValue: tx.payer?.documentNumber?.value || null,
            receiverName: tx.receiver?.name || null,
            receiverDocType: tx.receiver?.documentNumber?.type || null,
            receiverDocValue: tx.receiver?.documentNumber?.value || null,
            merchantName: tx.merchant?.name || null,
            merchantBusinessName: tx.merchant?.businessName || null,
            merchantCnpj: tx.merchant?.cnpj || null,
            merchantCategoryCode: tx.merchant?.categoryCode || null,
            paymentMethod: tx.paymentMethod || null,
            rawJson: JSON.stringify(tx),
            // Mark as unprocessed so standardization pipeline picks it up
            isProcessed: existing ? undefined : false,
          },
          create: {
            pluggyAccountId: pluggyAccount.id,
            pluggyTxId: tx.id,
            description: tx.description || 'No description',
            descriptionRaw: tx.descriptionRaw || null,
            amount: tx.amount,
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category || null,
            categoryId: tx.categoryId || null,
            operationType: tx.operationType || null,
            currencyCode: tx.currencyCode || 'BRL',
            installmentNumber: tx.creditCardMetadata?.installmentNumber ?? null,
            totalInstallments: tx.creditCardMetadata?.totalInstallments ?? null,
            cardNumber: tx.creditCardMetadata?.cardNumber ?? null,
            billDate: tx.creditCardMetadata?.billDate ? new Date(tx.creditCardMetadata.billDate) : null,
            payerName: tx.payer?.name || null,
            payerDocType: tx.payer?.documentNumber?.type || null,
            payerDocValue: tx.payer?.documentNumber?.value || null,
            receiverName: tx.receiver?.name || null,
            receiverDocType: tx.receiver?.documentNumber?.type || null,
            receiverDocValue: tx.receiver?.documentNumber?.value || null,
            merchantName: tx.merchant?.name || null,
            merchantBusinessName: tx.merchant?.businessName || null,
            merchantCnpj: tx.merchant?.cnpj || null,
            merchantCategoryCode: tx.merchant?.categoryCode || null,
            paymentMethod: tx.paymentMethod || null,
            rawJson: JSON.stringify(tx),
            isProcessed: false,
          },
        });

        txSynced++;
        if (!existing) txNew++;
      }

      txPage++;
    }
  }

  // Update PluggyItem sync metadata
  await prisma.pluggyItem.update({
    where: { id: connectionId },
    data: {
      lastSyncedAt: new Date(),
      status: 'ACTIVE',
      syncCount: { increment: 1 },
      executionStatus: itemStatus.executionStatus || null,
    },
  });

  // Run standardization pipeline on new transactions
  if (txNew > 0) {
    try {
      const pipeline = new StandardizationPipeline(prisma);
      const stdResult = await pipeline.processAll(connection.userId);
      console.log(`Standardization: ${stdResult.processed} processed, ${stdResult.errors} errors`);

      // Run classification on new standardized transactions
      try {
        const classifier = new ClassificationService();
        const importResult = await classifier.processNewTransactions(connection.userId, 'all');
        console.log(
          `Auto-imported: ${importResult.expenses} expenses, ${importResult.incomes} incomes, ${importResult.skipped} skipped`,
        );
      } catch (err) {
        console.error('Classification/import failed:', err);
        syncWarnings.push('Falha ao importar transações como despesas/receitas');
      }
    } catch (err) {
      console.error('Standardization pipeline failed:', err);
      syncWarnings.push('Falha na padronização de transações');
    }
  }

  if (accounts.length === 0) {
    syncWarnings.push('Nenhuma conta bancária retornada pela instituição');
  }
  if (txSynced === 0 && accounts.length > 0) {
    syncWarnings.push('Nenhuma transação retornada — possível rate limit do Open Finance');
  }

  console.log(`Sync completed: ${accounts.length} accounts, ${txSynced} transactions (${txNew} new)`);

  return {
    transactions: { synced: txSynced, newCount: txNew },
    accounts: accounts.length,
    warnings: syncWarnings.length > 0 ? syncWarnings : undefined,
  };
}

export async function syncAllConnections(): Promise<void> {
  if (!isPluggyEnabled()) return;

  const connections = await prisma.pluggyItem.findMany({
    where: { status: 'ACTIVE' },
  });

  for (const conn of connections) {
    try {
      await syncConnection(conn.id);
      console.log(`Synced connection: ${conn.connectorName}`);
    } catch (err) {
      console.error(`Failed to sync connection ${conn.id}:`, err);
      await prisma.pluggyItem.update({
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
