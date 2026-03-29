import { ApiError } from 'app/utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.userId) {
    throw ApiError.unauthorized();
  }
  next();
}
