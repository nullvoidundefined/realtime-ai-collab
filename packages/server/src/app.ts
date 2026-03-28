import { createServer } from "node:http";

import cookieParser from "cookie-parser";
import connectPgSimple from "connect-pg-simple";
import express from "express";
import session from "express-session";
import helmet from "helmet";

import { corsConfig } from "app/config/corsConfig.js";
import { isProduction, getPort } from "app/config/env.js";
import { pool, query } from "app/db/pool/pool.js";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "app/constants/session.js";
import { csrfGuard } from "app/middleware/csrfGuard/csrfGuard.js";
import { errorHandler } from "app/middleware/errorHandler/errorHandler.js";
import { notFoundHandler } from "app/middleware/notFoundHandler/notFoundHandler.js";
import { rateLimiter } from "app/middleware/rateLimiter/rateLimiter.js";
import { requestLogger } from "app/middleware/requestLogger/requestLogger.js";
import { authRouter } from "app/routes/auth.js";
import { documentsRouter } from "app/routes/documents.js";
import { initSocket } from "app/socket/index.js";
import { logger } from "app/utils/logs/logger.js";

function validateEnv(): void {
    if (!process.env.DATABASE_URL) {
        throw new Error("Fatal: DATABASE_URL is required");
    }
    if (isProduction() && !process.env.CORS_ORIGIN) {
        throw new Error("Fatal: CORS_ORIGIN is required in production");
    }
}

const PgStore = connectPgSimple(session);

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(corsConfig);
app.use(requestLogger);
app.use(rateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(csrfGuard);
app.use(
    session({
        store: new PgStore({ pool, tableName: "sessions" }),
        secret: process.env.SESSION_SECRET!,
        resave: false,
        saveUninitialized: false,
        name: SESSION_COOKIE_NAME,
        cookie: {
            httpOnly: true,
            secure: isProduction(),
            sameSite: "lax",
            maxAge: SESSION_TTL_MS,
        },
    }),
);

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
    try {
        await query("SELECT 1");
        res.status(200).json({ status: "ok", db: "connected" });
    } catch {
        res.status(503).json({ status: "degraded", db: "disconnected" });
    }
});

app.use("/auth", authRouter);
app.use("/documents", documentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

initSocket(httpServer);

export { httpServer };

export function startServer(): void {
    validateEnv();

    pool.on("error", (err) => {
        logger.error({ err }, "Unexpected idle-client error in pg pool");
    });

    process.on("uncaughtException", (err) => {
        logger.fatal({ err }, "Uncaught exception – shutting down");
        logger.flush();
        process.exit(1);
    });
    process.on("unhandledRejection", (reason) => {
        logger.fatal({ reason }, "Unhandled rejection – shutting down");
        logger.flush();
        process.exit(1);
    });

    const port = getPort();
    httpServer.listen(port, () => logger.info({ port }, "Server running"));

    async function shutdown(signal: string) {
        logger.info({ signal }, "Shutting down gracefully");
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
        logger.info("HTTP server closed");
        await pool.end();
        process.exit(0);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
