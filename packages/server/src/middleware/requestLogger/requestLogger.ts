import { logger } from 'app/utils/logs/logger.js';
import { pinoHttp } from 'pino-http';

export const requestLogger = pinoHttp({ logger });
