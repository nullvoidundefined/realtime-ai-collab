import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    logger.warn({ err, path: req.path }, err.message);
    const body: { error: string; message: string; details?: unknown } = {
      error: err.code,
      message: err.message,
    };
    if (err.details !== undefined) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  const status = (err as any).status ?? (err as any).statusCode ?? 500;
  if (status < 500) {
    logger.warn({ err, path: req.path }, err.message);
    res.status(status).json({ error: err.message, message: err.message });
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res
    .status(500)
    .json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
}
