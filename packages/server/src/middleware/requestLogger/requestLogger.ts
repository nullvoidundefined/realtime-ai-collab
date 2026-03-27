import pinoHttp from "pino-http";
import { logger } from "../../utils/logs/logger.js";

export const requestLogger = pinoHttp({ logger });
