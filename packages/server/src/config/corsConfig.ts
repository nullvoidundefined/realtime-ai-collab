import cors from 'cors';

const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
const origin = rawOrigin.includes(',')
  ? rawOrigin.split(',').map((o) => o.trim())
  : rawOrigin;

export const corsConfig = cors({
  origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-CSRF-Token'],
});
