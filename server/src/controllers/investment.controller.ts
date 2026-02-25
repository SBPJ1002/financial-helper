import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as investmentService from '../services/investment.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const investments = await investmentService.list(req.userId!);
    res.json(investments);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const investment = await investmentService.getById(req.userId!, req.params.id as string);
    res.json(investment);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const investment = await investmentService.create(req.userId!, req.body);
    res.status(201).json(investment);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const investment = await investmentService.update(req.userId!, req.params.id as string, req.body);
    res.json(investment);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await investmentService.remove(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const summary = await investmentService.getSummary(req.userId!);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function getTypes(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const types = await investmentService.getInvestmentTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
}
