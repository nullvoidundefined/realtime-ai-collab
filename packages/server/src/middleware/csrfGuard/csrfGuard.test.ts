import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const CSRF_SECRET = 'test-csrf-secret';

function createTestApp() {
  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => CSRF_SECRET,
    getSessionIdentifier: (req: any) => req.cookies?.sid ?? '',
    cookieName: '__csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
    },
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ token });
  });

  app.use(doubleCsrfProtection);

  app.post('/test', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('CSRF protection', () => {
  it('GET /api/csrf-token returns a token and sets __csrf cookie', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/csrf-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    const cookies = res.headers['set-cookie'];
    const csrfCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c.startsWith('__csrf'),
    );
    expect(csrfCookie).toBeDefined();
  });

  it('POST without CSRF token is rejected with 403', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send({ data: 'hello' });

    expect(res.status).toBe(403);
  });

  it('POST with valid CSRF token succeeds', async () => {
    const app = createTestApp();
    const agent = request.agent(app);

    // 1. Fetch CSRF token
    const tokenRes = await agent.get('/api/csrf-token');
    expect(tokenRes.status).toBe(200);
    const { token } = tokenRes.body;

    // 2. POST with the token in the header
    const postRes = await agent
      .post('/test')
      .set('x-csrf-token', token)
      .set('Content-Type', 'application/json')
      .send({ data: 'hello' });

    expect(postRes.status).toBe(200);
    expect(postRes.body).toEqual({ ok: true });
  });

  it('POST with invalid CSRF token is rejected', async () => {
    const app = createTestApp();
    const agent = request.agent(app);

    // Fetch to get the cookie
    await agent.get('/api/csrf-token');

    // Send a bad token
    const postRes = await agent
      .post('/test')
      .set('x-csrf-token', 'definitely-not-valid')
      .set('Content-Type', 'application/json')
      .send({ data: 'hello' });

    expect(postRes.status).toBe(403);
  });
});
