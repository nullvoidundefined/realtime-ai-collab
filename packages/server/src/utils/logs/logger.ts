import pino from "pino";
import { isProduction } from "../../config/env.js";

export const logger = pino(
    isProduction()
        ? { level: "info" }
        : {
              level: "debug",
              transport: {
                  target: "pino-pretty",
                  options: { colorize: true },
              },
          }
);
