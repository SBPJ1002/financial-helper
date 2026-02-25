import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as scenarioService from '../services/scenario.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scenarios = await scenarioService.list(req.userId!);
    res.json(scenarios);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scenario = await scenarioService.getById(req.userId!, req.params.id as string);
    res.json(scenario);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scenario = await scenarioService.create(req.userId!, req.body);
    res.status(201).json(scenario);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scenario = await scenarioService.update(req.userId!, req.params.id as string, req.body);
    res.json(scenario);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await scenarioService.remove(req.userId!, req.params.id as string);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

export async function duplicate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scenario = await scenarioService.duplicate(req.userId!, req.params.id as string);
    res.status(201).json(scenario);
  } catch (err) {
    next(err);
  }
}
