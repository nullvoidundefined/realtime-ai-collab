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
import { requireAuth } from './requireAuth.js';

function createApp() {
  const app = express();

  // Simulate session middleware
  app.use((req, _res, next) => {
    (req as any).session = {};
    next();
  });

  app.get('/protected', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  app.use(errorHandler);

  return app;
}

function createAppWithSession(userId: string) {
  const app = express();

  app.use((req, _res, next) => {
    (req as any).session = { userId };
    next();
  });

  app.get('/protected', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  app.use(errorHandler);

  return app;
}

describe('requireAuth middleware', () => {
  it('returns 401 when session has no userId', async () => {
    const app = createApp();
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });

  it('allows request through when session has userId', async () => {
    const app = createAppWithSession('user-123');
    const res = await request(app).get('/protected');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
