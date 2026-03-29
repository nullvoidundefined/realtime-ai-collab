import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

/**
 * These tests create minimal Express apps with the rate limiters applied
 * so we can verify status codes and response bodies without starting the
 * full server (which needs DB, Redis, sessions, etc.).
 */

// We need to import after vitest is set up so the module-level
// isProduction() guard does not crash on missing env.
async function importLimiters() {
  const mod = await import('./rateLimiter.js');
  return mod;
}

describe('rateLimiter (general API)', () => {
  it('returns 429 with standardized error body after exceeding 100 requests', async () => {
    const { rateLimiter } = await importLimiters();

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const agent = request(app);

    // Send 100 requests (should all succeed)
    for (let i = 0; i < 100; i++) {
      await agent.get('/test');
    }

    // 101st request should be rate limited
    const res = await agent.get('/test');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    });
  });
});

describe('authRateLimiter', () => {
  it('returns 429 with standardized error body after exceeding 20 requests', async () => {
    const { authRateLimiter } = await importLimiters();

    const app = express();
    app.post('/login', authRateLimiter, (_req, res) => res.json({ ok: true }));

    const agent = request(app);

    // Send 20 requests (should all succeed)
    for (let i = 0; i < 20; i++) {
      await agent.post('/login');
    }

    // 21st request should be rate limited
    const res = await agent.post('/login');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    });
  });
});
