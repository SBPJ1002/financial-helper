import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as expenseService from '../services/expense.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as 'FIXED' | 'VARIABLE' | undefined;
    const expenses = await expenseService.list(req.userId!, type);
    res.json(expenses);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await expenseService.getById(req.userId!, req.params.id as string);
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await expenseService.create(req.userId!, req.body);
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await expenseService.update(req.userId!, req.params.id as string, req.body);
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await expenseService.remove(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

export async function addHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await expenseService.addHistory(req.userId!, req.params.id as string, req.body);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const history = await expenseService.getHistory(req.userId!, req.params.id as string);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function setGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const goal = await expenseService.setGoal(req.userId!, req.params.id as string, req.body);
    res.json(goal);
  } catch (err) {
    next(err);
  }
}

export async function removeGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await expenseService.removeGoal(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

export async function deleteFuture(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await expenseService.deleteFuture(req.userId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateFutureAmount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { amount } = req.body;
    const result = await expenseService.updateFutureAmount(req.userId!, req.params.id as string, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function generateRecurring(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const months = parseInt((req.body.months as string) || '6');
    const result = await expenseService.generateRecurring(req.userId!, req.params.id as string, Math.min(months, 24));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function toggleType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await expenseService.toggleType(req.userId!, req.params.id as string);
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function getProjections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const months = req.query.months ? parseInt(req.query.months as string) : 6;
    const projections = await expenseService.getProjections(req.userId!, months);
    res.json(projections);
  } catch (err) {
    next(err);
  }
}
