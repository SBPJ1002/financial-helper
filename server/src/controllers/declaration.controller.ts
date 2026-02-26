import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import * as declarationService from '../services/declaration.service.js';
import { DeclarationMatcherService } from '../services/declaration-matcher.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const declarations = await declarationService.list(req.userId!);
    res.json(declarations);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const declaration = await declarationService.getById(req.userId!, req.params.id as string);
    res.json(declaration);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const declaration = await declarationService.create(req.userId!, req.body);
    res.status(201).json(declaration);
  } catch (err) {
    next(err);
  }
}

export async function bulkCreate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const declarations = await declarationService.bulkCreate(req.userId!, req.body);
    res.status(201).json(declarations);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const declaration = await declarationService.update(req.userId!, req.params.id as string, req.body);
    res.json(declaration);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await declarationService.remove(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

export async function triggerMatching(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const matcher = new DeclarationMatcherService();
    const result = await matcher.matchDeclarationsForUser(req.userId!, month);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMatchResults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const month = req.params.month as string;
    const matches = await prisma.declarationMatch.findMany({
      where: {
        month,
        declaration: { userId: req.userId! },
      },
      include: {
        declaration: { select: { label: true, paymentMethod: true, estimatedAmount: true } },
        stdTransaction: { select: { descriptionOriginal: true, absoluteAmount: true, date: true } },
      },
      orderBy: { confidenceScore: 'desc' },
    });
    res.json(matches);
  } catch (err) {
    next(err);
  }
}
