import { ApiError } from 'app/utils/ApiError.js';
import type { Request, Response } from 'express';

export function notFoundHandler(req: Request, _res: Response): void {
  throw ApiError.notFound(`Route ${req.method} ${req.path} not found`);
}
