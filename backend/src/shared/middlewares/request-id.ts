import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
      userId?: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('x-request-id', req.id);
  next();
}
