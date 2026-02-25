import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as categoryService from '../services/category.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as string | undefined;
    const categories = await categoryService.list(req.userId!, type);
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.create(req.userId!, req.body);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.update(req.userId!, req.params.id as string, req.body);
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await categoryService.remove(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}
