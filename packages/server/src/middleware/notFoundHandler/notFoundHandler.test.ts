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

import { errorHandler } from 'app/middleware/errorHandler/errorHandler.js';
import { notFoundHandler } from './notFoundHandler.js';

function createApp() {
  const app = express();
  app.get('/exists', (_req, res) => res.json({ ok: true }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('notFoundHandler middleware', () => {
  it('returns 404 for unmatched routes', async () => {
    const app = createApp();
    const res = await request(app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'NOT_FOUND',
      message: 'Route GET /nope not found',
    });
  });

  it('does not intercept valid routes', async () => {
    const app = createApp();
    const res = await request(app).get('/exists');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('includes the HTTP method in the error message', async () => {
    const app = createApp();
    const res = await request(app).post('/missing');

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('POST');
  });
});
