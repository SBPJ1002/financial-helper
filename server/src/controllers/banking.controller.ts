import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import * as pluggyService from '../services/pluggy.service.js';
import * as transactionImportService from '../services/transactionImport.service.js';

export async function checkAvailability(_req: Request, res: Response) {
  res.json({ enabled: pluggyService.isPluggyEnabled() });
}

export async function createConnectToken(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const token = await pluggyService.createConnectToken(userId);
    res.json({ accessToken: token });
  } catch (err) {
    next(err);
  }
}

export async function listConnections(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const connections = await prisma.pluggyItem.findMany({
      where: { userId },
      include: {
        accounts: {
          include: {
            stdAccount: {
              select: { id: true, accountLabel: true, sourceType: true, currentBalance: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to frontend-friendly shape
    const mapped = connections.map(conn => ({
      id: conn.id,
      pluggyItemId: conn.pluggyItemId,
      connectorName: conn.connectorName,
      status: conn.status,
      lastSyncAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
      accounts: conn.accounts
        .filter(a => a.stdAccount)
        .map(a => ({
          id: a.stdAccount!.id,
          name: a.stdAccount!.accountLabel,
          type: a.type,
          sourceType: a.stdAccount!.sourceType,
          balance: a.stdAccount!.currentBalance,
        })),
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

export async function createConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const { pluggyItemId, connectorName } = req.body;

    const connection = await prisma.pluggyItem.create({
      data: { userId, pluggyItemId, connectorName },
    });

    // Sync immediately
    try {
      await pluggyService.syncConnection(connection.id);
    } catch {
      // Sync failure is not fatal
    }

    const full = await prisma.pluggyItem.findUnique({
      where: { id: connection.id },
      include: {
        accounts: {
          include: {
            stdAccount: {
              select: { id: true, accountLabel: true, sourceType: true, currentBalance: true },
            },
          },
        },
      },
    });

    res.status(201).json(full);
  } catch (err) {
    next(err);
  }
}

export async function deleteConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const id = req.params.id as string;

    const conn = await prisma.pluggyItem.findFirst({ where: { id, userId } });
    if (!conn) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    await prisma.pluggyItem.delete({ where: { id } });
    res.json({ message: 'Connection deleted' });
  } catch (err) {
    next(err);
  }
}

export async function syncConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const id = req.params.id as string;

    const conn = await prisma.pluggyItem.findFirst({ where: { id, userId } });
    if (!conn) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const result = await pluggyService.syncConnection(id);
    res.json({ message: 'Sync completed', ...result });
  } catch (err) {
    next(err);
  }
}

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const accounts = await prisma.stdAccount.findMany({
      where: { userId },
      include: {
        pluggyAccount: {
          include: {
            pluggyItem: { select: { connectorName: true } },
          },
        },
      },
    });

    const mapped = accounts.map(a => ({
      id: a.id,
      name: a.accountLabel,
      type: a.pluggyAccount.type,
      sourceType: a.sourceType,
      balance: a.currentBalance,
      currencyCode: a.currencyCode,
      bankName: a.bankName,
      connectorName: a.pluggyAccount.pluggyItem.connectorName,
      isActive: a.isActive,
      isPrimary: a.isPrimary,
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const skip = (page - 1) * limit;

    const where = { userId } as const;

    const [transactions, total] = await Promise.all([
      prisma.stdTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          stdAccount: {
            select: { accountLabel: true, bankName: true, sourceType: true },
          },
        },
      }),
      prisma.stdTransaction.count({ where }),
    ]);

    const mapped = transactions.map(tx => ({
      id: tx.id,
      description: tx.descriptionClean,
      descriptionOriginal: tx.descriptionOriginal,
      direction: tx.direction,
      amount: tx.absoluteAmount,
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      counterpartName: tx.counterpartName,
      isInternalTransfer: tx.isInternalTransfer,
      isInvoicePayment: tx.isInvoicePayment,
      isRefund: tx.isRefund,
      imported: tx.imported,
      installmentNumber: tx.installmentNumber,
      totalInstallments: tx.totalInstallments,
      stdAccount: {
        accountLabel: tx.stdAccount.accountLabel,
        bankName: tx.stdAccount.bankName,
        sourceType: tx.stdAccount.sourceType,
      },
    }));

    res.json({ transactions: mapped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

export async function importTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const mode = (req.body?.mode || 'all') as 'all' | 'expenses_only' | 'incomes_only';
    const result = await transactionImportService.importTransactions(userId, mode);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
