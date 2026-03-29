import { isProduction } from 'app/config/env.js';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

if (isProduction() && !process.env.RATE_LIMIT_STORAGE_URI) {
  console.warn(
    'WARNING: rate limiter is using in-memory storage in production. ' +
      'Set RATE_LIMIT_STORAGE_URI for a persistent store.',
  );
}

const rateLimitResponse = (_req: Request, res: Response) => {
  res.status(429).json({
    error: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  });
};

/** General API limiter: 100 requests per 15 minutes. */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

/** Stricter limit for auth routes: 20 requests per 15 minutes. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
