import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

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

  return app;
}

describe('requireAuth middleware', () => {
  it('returns 401 when session has no userId', async () => {
    const app = createApp();
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('allows request through when session has userId', async () => {
    const app = createAppWithSession('user-123');
    const res = await request(app).get('/protected');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
