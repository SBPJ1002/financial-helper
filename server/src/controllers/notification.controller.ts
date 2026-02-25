import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as notificationService from '../services/notification.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.list(req.userId!, unreadOnly);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadCount(req.userId!);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.markAsRead(req.userId!, req.params.id as string);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllAsRead(req.userId!);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
}
