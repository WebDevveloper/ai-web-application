import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import {
  createAuthRouter,
  createSessionMiddleware,
} from "./routes/authRoutes.js";
import { createCampusRouter } from "./routes/campusRoutes.js";
import { createChatRouter } from "./routes/chatRoutes.js";
import { createFeedbackRouter } from "./routes/feedbackRoutes.js";

function createCorsOptions(allowedOrigins) {
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
  };
}

export function createApp({
  assistantService,
  campusRepository,
  authService,
  config,
}) {
  const app = express();

  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);
  app.use(helmet());
  app.use(cors(createCorsOptions(config.clientOrigins)));
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Слишком много запросов. Попробуйте снова через минуту.",
      },
    }),
  );

  app.get("/api/health", async (_request, response) => {
    try {
      const databaseConnected = await campusRepository.ping();
      const navigator = databaseConnected
        ? await campusRepository.getNavigatorStatus?.()
        : null;
      if (navigator?.enabled && !navigator.importedAt) {
        response
          .status(503)
          .json({
            status: "degraded",
            database: "connected",
            navigator: "not_imported",
          });
        return;
      }
      response.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ok" : "degraded",
        database: databaseConnected ? "connected" : "not_configured",
      });
    } catch (error) {
      console.error("Database health check failed:", error.message);
      response
        .status(503)
        .json({ status: "degraded", database: "unavailable" });
    }
  });

  app.use("/api", (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", createSessionMiddleware({ authService, config }));
  app.use("/api/auth", createAuthRouter({ authService, config }));
  app.use("/api", createCampusRouter({ campusRepository, config }));
  app.use("/api", createChatRouter({ assistantService, config }));
  app.use("/api", createFeedbackRouter({ campusRepository }));
  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "API-маршрут не найден." });
  });

  app.use((error, _request, response, _next) => {
    if (error.type === "entity.parse.failed") {
      response.status(400).json({ error: "Некорректный JSON в запросе." });
      return;
    }

    if (error.type === "entity.too.large") {
      response
        .status(413)
        .json({ error: "Запрос превышает допустимый размер." });
      return;
    }

    if (error.message === "Origin is not allowed by CORS.") {
      response
        .status(403)
        .json({ error: "Этот источник запросов не разрешён." });
      return;
    }

    console.error("Unhandled API error:", error);
    response.status(500).json({ error: "Внутренняя ошибка сервера." });
  });

  return app;
}
