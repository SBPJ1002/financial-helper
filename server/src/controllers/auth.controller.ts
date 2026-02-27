import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization!.slice(7);
    await authService.logout(token);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { plan } = req.body;
    if (plan !== 'FREE' && plan !== 'AI_AGENT') {
      res.status(400).json({ message: 'Invalid plan' });
      return;
    }
    const user = await authService.updatePlan(req.userId!, plan);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.userId!);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
