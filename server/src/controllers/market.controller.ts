import type { Request, Response, NextFunction } from 'express';
import * as marketDataService from '../services/marketData.service.js';

export async function getQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const symbol = req.params.symbol as string;
    const quote = await marketDataService.getStockQuote(symbol);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    res.json(quote);
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const keywords = req.query.q as string;
    if (!keywords) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const results = await marketDataService.searchSymbol(keywords);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const symbol = req.params.symbol as string;
    const outputSize = (req.query.size as 'compact' | 'full') || 'compact';
    const history = await marketDataService.getStockHistory(symbol, outputSize);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function getQuota(_req: Request, res: Response, next: NextFunction) {
  try {
    const quota = await marketDataService.getDailyQuota();
    res.json(quota);
  } catch (err) {
    next(err);
  }
}

export async function refreshPortfolio(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await marketDataService.updatePortfolioPrices();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
