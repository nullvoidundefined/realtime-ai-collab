import { corsConfig } from 'app/config/corsConfig.js';
import { getPort, isProduction } from 'app/config/env.js';
import { redis } from 'app/config/redis.js';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from 'app/constants/session.js';
import { pool, query } from 'app/db/pool/pool.js';
import {
  doubleCsrfProtection,
  generateCsrfToken,
} from 'app/middleware/csrfGuard/csrfGuard.js';
import { errorHandler } from 'app/middleware/errorHandler/errorHandler.js';
import { notFoundHandler } from 'app/middleware/notFoundHandler/notFoundHandler.js';
import { rateLimiter } from 'app/middleware/rateLimiter/rateLimiter.js';
import { requestLogger } from 'app/middleware/requestLogger/requestLogger.js';
import { authRouter } from 'app/routes/auth.js';
import { documentsRouter } from 'app/routes/documents.js';
import { initSocket } from 'app/socket/index.js';
import { logger } from 'app/utils/logs/logger.js';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { createServer } from 'node:http';

function validateEnv(): void {
  const required = ['DATABASE_URL', 'SESSION_SECRET', 'ANTHROPIC_API_KEY'];
  if (isProduction()) {
    required.push('CORS_ORIGIN', 'REDIS_URL', 'CSRF_SECRET');
  }
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables');
    process.exit(1);
  }
}

const PgStore = connectPgSimple(session);

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(corsConfig);
app.use(requestLogger);
app.use(rateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/* --- Request timeout (exempt Socket.IO and SSE streaming) --- */
app.use((req, res, next) => {
  if (
    req.path.startsWith('/socket.io') ||
    req.headers.accept === 'text/event-stream'
  ) {
    return next();
  }
  req.setTimeout(30_000);
  res.setTimeout(30_000);
  next();
});

/* --- CSRF token endpoint (must precede the protection middleware) --- */
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

app.use(doubleCsrfProtection);
app.use(
  session({
    store: new PgStore({ pool, tableName: 'sessions' }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: SESSION_COOKIE_NAME,
    cookie: {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
    },
  }),
);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/ready', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
});

app.use('/auth', authRouter);
app.use('/documents', documentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const io = initSocket(httpServer);

export { httpServer };

export function startServer(): void {
  validateEnv();

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected idle-client error in pg pool');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception – shutting down');
    logger.flush();
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection – shutting down');
    logger.flush();
    process.exit(1);
  });

  const port = getPort();
  httpServer.listen(port, () => logger.info({ port }, 'Server running'));

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down gracefully');

    // 1. Close HTTP server (stop accepting new connections)
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    logger.info('HTTP server closed');

    // 2. Close Socket.IO server (disconnect all sockets)
    await io.close();
    logger.info('Socket.IO server closed');

    // 3. Drain database pool
    await pool.end();
    logger.info('Database pool drained');

    // 4. Quit Redis
    await redis.quit();
    logger.info('Redis connection closed');

    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
