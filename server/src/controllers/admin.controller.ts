import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as adminService from '../services/admin.service.js';
import { fetchAndStoreRates } from '../services/bcb.service.js';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const result = await adminService.listUsers(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await adminService.updateUser(req.params.id as string, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getMetrics(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const metrics = await adminService.getMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function refreshRates(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await fetchAndStoreRates();
    res.json({ message: 'Rates refreshed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const key = req.query.key as string | undefined;
    const result = await adminService.getLogs(page, limit, key);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
