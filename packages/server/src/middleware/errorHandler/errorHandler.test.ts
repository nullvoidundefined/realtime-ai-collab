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

import { errorHandler } from './errorHandler.js';

function createApp() {
  const app = express();

  app.get('/error', (_req, _res, next) => {
    next(new Error('something broke'));
  });

  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('returns 500 with generic error message', async () => {
    const app = createApp();
    const res = await request(app).get('/error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('does not leak error details to client', async () => {
    const app = createApp();
    const res = await request(app).get('/error');

    expect(res.body.message).toBeUndefined();
    expect(res.body.stack).toBeUndefined();
  });
});
