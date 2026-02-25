import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or invalid token');
    }

    const token = header.slice(7);
    const payload = verifyToken(token);

    // Verify session exists and is not expired
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw ApiError.unauthorized('Session expired');
    }

    // Verify user is active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account is deactivated');
    }

    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else {
      next(ApiError.unauthorized('Invalid token'));
    }
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    next(ApiError.forbidden('Admin access required'));
    return;
  }
  next();
}
