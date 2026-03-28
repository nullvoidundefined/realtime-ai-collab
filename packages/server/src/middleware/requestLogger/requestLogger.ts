import { pinoHttp } from "pino-http";
import { logger } from "app/utils/logs/logger.js";

export const requestLogger = pinoHttp({ logger });
