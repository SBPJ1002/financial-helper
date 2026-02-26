import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as onboardingService from '../services/onboarding.service.js';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await onboardingService.getProfile(req.userId!);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await onboardingService.updateProfile(req.userId!, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function completeOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await onboardingService.completeOnboarding(req.userId!);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}
