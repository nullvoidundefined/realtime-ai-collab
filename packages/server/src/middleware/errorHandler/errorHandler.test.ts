import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('app/utils/logs/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    flush: vi.fn(),
  },
}));

import { ApiError } from 'app/utils/ApiError.js';
import { errorHandler } from './errorHandler.js';

function createApp() {
  const app = express();

  app.get('/error', (_req, _res, next) => {
    next(new Error('something broke'));
  });

  app.get('/api-error', (_req, _res, next) => {
    next(ApiError.notFound('Document not found'));
  });

  app.get('/api-error-details', (_req, _res, next) => {
    next(ApiError.badRequest('Validation failed', [{ field: 'email' }]));
  });

  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('returns 500 with standardized format for unknown errors', async () => {
    const app = createApp();
    const res = await request(app).get('/error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('does not leak error details to client for unknown errors', async () => {
    const app = createApp();
    const res = await request(app).get('/error');

    expect(res.body.stack).toBeUndefined();
  });

  it('returns correct status and code for ApiError', async () => {
    const app = createApp();
    const res = await request(app).get('/api-error');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'NOT_FOUND',
      message: 'Document not found',
    });
  });

  it('includes details when ApiError has them', async () => {
    const app = createApp();
    const res = await request(app).get('/api-error-details');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'email' }],
    });
  });
});
