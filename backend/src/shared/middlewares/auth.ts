import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';

export function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing bearer token'));
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    (req as any).user = payload;
    return next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: Array<'USER' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next(new UnauthorizedError());
    if (!roles.includes(user.role)) return next(new ForbiddenError());
    next();
  };
}

export function requirePlan(...plans: Array<'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next(new UnauthorizedError());
    if (!plans.includes(user.plan)) return next(new ForbiddenError('Plan upgrade required'));
    next();
  };
}
