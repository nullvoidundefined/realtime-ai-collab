import { isProduction } from 'app/config/env.js';
import pino from 'pino';

export const logger = pino(
  isProduction()
    ? { level: 'info' }
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      },
);
