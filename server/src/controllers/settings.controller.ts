import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as userSettingsService from '../services/userSettings.service.js';

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const settings = await userSettingsService.getSettings(req.userId!);
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userSettingsService.updateSettings(req.userId!, req.body);
    const settings = await userSettingsService.getSettings(req.userId!);
    res.json(settings);
  } catch (err) {
    next(err);
  }
}
