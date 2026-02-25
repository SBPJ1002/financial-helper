import type { Request, Response, NextFunction } from 'express';
import * as bcbService from '../services/bcb.service.js';

export async function getCurrent(_req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await bcbService.getCurrentRates();
    res.json(rates);
  } catch (err) {
    next(err);
  }
}

export async function getPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await bcbService.getPublicRates();
    res.json(rates);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as string;
    const days = parseInt((req.query.days as string) || '30');
    const history = await bcbService.getRateHistory(type, days);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function refresh(_req: Request, res: Response, next: NextFunction) {
  try {
    await bcbService.fetchAndStoreRates();
    res.json({ message: 'Rates refreshed' });
  } catch (err) {
    next(err);
  }
}
