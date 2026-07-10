import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { Prisma } from '@prisma/client';

export function audit(action: string, resource: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.userId) {
        const meta: Prisma.InputJsonValue = {
          params: req.params as Prisma.InputJsonValue,
          query: req.query as Prisma.InputJsonValue,
          body: sanitize(req.body) as Prisma.InputJsonValue,
        };
        await prisma.auditLog.create({
          data: {
            userId: req.userId,
            action,
            resource,
            metadata: meta,
            ip: req.ip ?? null,
          },
        });
      }
      next();
    } catch {
      next();
    }
  };
}

function sanitize(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body ?? null;
  const clone: Record<string, unknown> = {};
  for (const k of Object.keys(body as Record<string, unknown>)) {
    if (/password|token|secret|key/i.test(k)) clone[k] = '[REDACTED]';
    else clone[k] = (body as Record<string, unknown>)[k];
  }
  return clone;
}
