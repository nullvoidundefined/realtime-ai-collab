import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import session from "express-session";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { getPort } from "./config/env.js";
import { corsConfig } from "./config/corsConfig.js";
import { requestLogger } from "./middleware/requestLogger/requestLogger.js";
import { notFoundHandler } from "./middleware/notFoundHandler/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { initSocket } from "./socket/index.js";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(corsConfig);
app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
    session({
        secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-prod",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRouter);
app.use("/documents", documentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

initSocket(httpServer);

export { httpServer };

httpServer.listen(getPort(), () => console.log(`Server on port ${getPort()}`));
