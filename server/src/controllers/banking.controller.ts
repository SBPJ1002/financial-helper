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
    const connections = await prisma.bankConnection.findMany({
      where: { userId },
      include: {
        accounts: { select: { id: true, name: true, type: true, balance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(connections);
  } catch (err) {
    next(err);
  }
}

export async function createConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const { pluggyItemId, connectorName } = req.body;

    const connection = await prisma.bankConnection.create({
      data: { userId, pluggyItemId, connectorName },
    });

    // Sync immediately
    try {
      await pluggyService.syncConnection(connection.id);
    } catch {
      // Sync failure is not fatal
    }

    const full = await prisma.bankConnection.findUnique({
      where: { id: connection.id },
      include: { accounts: true },
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

    const conn = await prisma.bankConnection.findFirst({ where: { id, userId } });
    if (!conn) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    await prisma.bankConnection.delete({ where: { id } });
    res.json({ message: 'Connection deleted' });
  } catch (err) {
    next(err);
  }
}

export async function syncConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const id = req.params.id as string;

    const conn = await prisma.bankConnection.findFirst({ where: { id, userId } });
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
    const accounts = await prisma.bankAccount.findMany({
      where: { bankConnection: { userId } },
      include: { bankConnection: { select: { connectorName: true } } },
    });
    res.json(accounts);
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

    const where = {
      bankAccount: { bankConnection: { userId } },
    } as const;

    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          bankAccount: {
            select: { name: true, bankConnection: { select: { connectorName: true } } },
          },
        },
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
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
