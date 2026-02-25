import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as incomeService from '../services/income.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const month = req.query.month as string | undefined;
    const incomes = month
      ? await incomeService.listByMonth(req.userId!, month)
      : await incomeService.list(req.userId!);
    res.json(incomes);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const income = await incomeService.create(req.userId!, req.body);
    res.status(201).json(income);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const income = await incomeService.update(req.userId!, req.params.id as string, req.body);
    res.json(income);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await incomeService.remove(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}
