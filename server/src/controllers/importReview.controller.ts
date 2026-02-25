import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as importReviewService from '../services/importReview.service.js';

export async function getImportBatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const batchId = req.params.batchId as string;
    const result = await importReviewService.getImportBatch(req.userId!, batchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function bulkRename(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { oldDescription, newDescription, scope, batchId } = req.body;
    const result = await importReviewService.bulkRename(req.userId!, oldDescription, newDescription, scope, batchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function toggleExpenseType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await importReviewService.toggleExpenseType(req.userId!, req.params.id as string);
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function renameItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, id, newDescription } = req.body;
    const item = await importReviewService.renameItem(req.userId!, type, id, newDescription);
    res.json(item);
  } catch (err) {
    next(err);
  }
}
