import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as dashboardService from '../services/dashboard.service.js';

export async function getSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const month = (req.query.month as string) || getCurrentMonth();
    const summary = await dashboardService.getSummary(req.userId!, month);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
