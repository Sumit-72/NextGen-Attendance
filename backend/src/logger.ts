import pino from "pino";
import { env } from "./config/env";

let logger: pino.Logger | undefined;

export function getLogger() {
  if (!logger) {
    logger = pino({
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
      redact: ["req.headers.authorization", "firebaseToken", "otp", "password", "token"],
    });
  }

  return logger;
}
