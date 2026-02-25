import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as assetService from '../services/asset.service.js';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const query = (req.query.q as string) || '';
    const type = req.query.type as string | undefined;
    const assets = await assetService.searchAssets(query, type);
    res.json(assets);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const asset = await assetService.getAssetById(req.params.id as string);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function updatePrice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await assetService.updateAssetPrice(req.params.id as string, req.body.price);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateMultiplePrices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const results = await assetService.updateMultiplePrices(req.body.updates);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}
