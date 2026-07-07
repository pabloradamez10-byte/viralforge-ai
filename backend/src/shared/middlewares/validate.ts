import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/app-error.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (!result.success) return next(new ValidationError(result.error.flatten()));
    // replace with parsed (and possibly transformed) data
    (req as any)[source] = result.data;
    next();
  };
}
