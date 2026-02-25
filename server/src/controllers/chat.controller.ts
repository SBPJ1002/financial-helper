import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as chatService from '../services/chat.service.js';

export async function send(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await chatService.sendMessage(req.userId!, req.body.message);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const messages = await chatService.getHistory(req.userId!);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function clearHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await chatService.clearHistory(req.userId!);
    res.json({ message: 'Chat history cleared' });
  } catch (err) {
    next(err);
  }
}
