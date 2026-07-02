import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { env } from "./config/env";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN ?? true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  app.use(requestContextMiddleware);

  app.use("/api", router);
  app.use(errorMiddleware);

  return app;
}
