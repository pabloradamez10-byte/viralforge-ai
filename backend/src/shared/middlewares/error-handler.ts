import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors/app-error.js';
import { logger } from '../../config/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  const requestId = req.id;

  if (err instanceof ZodError) {
    const ve = new ValidationError(err.flatten());
    logger.warn({ requestId, errors: ve.details }, 'Validation error');
    return res.status(ve.statusCode).json({
      error: { code: ve.code, message: ve.message, details: ve.details, requestId },
    });
  }

  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, status: err.statusCode, msg: err.message }, 'App error');
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details, requestId },
    });
  }

  logger.error({ requestId, err }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}
