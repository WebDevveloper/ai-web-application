import { Router } from "express";
import rateLimit from "express-rate-limit";

export const SESSION_COOKIE = "campus_session";

export function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.auth?.cookieSecure ?? config.environment === "production",
    sameSite: config.auth?.cookieSameSite || "lax",
    path: "/api",
  };
}

export function createSessionMiddleware({ authService, config }) {
  return async (request, response, next) => {
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) return next();
    if (!authService?.isConfigured)
      return response.status(503).json({ error: "Вход временно недоступен." });
    try {
      const { user, sessionId } = await authService.authenticate(token);
      request.user = user;
      request.sessionId = sessionId;
      next();
    } catch (error) {
      if (error.status === 401) {
        response.clearCookie(SESSION_COOKIE, sessionCookieOptions(config));
        // Не превращаем истёкшую сессию в гостевой запрос к чужой группе.
        return response.status(401).json({ error: error.message });
      }
      next(error);
    }
  };
}

export function createAuthRouter({ authService, config }) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    if (!authService?.isConfigured)
      return response
        .status(503)
        .json({
          error: "Вход пока не настроен. Справочник доступен без аккаунта.",
        });
    next();
  });
  router.get("/me", (request, response) =>
    response.json({ user: request.user || null }),
  );

  router.use((request, response, next) => {
    // Заголовок нельзя отправить HTML-формой; сторонний JS не пройдёт CORS-preflight.
    const origin = request.get("Origin");
    if (
      request.get("X-Campus-Request") !== "1" ||
      (origin && !config.clientOrigins.includes(origin))
    ) {
      return response.status(403).json({ error: "Этот запрос не разрешён." });
    }
    next();
  });
  const credentialsLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Слишком много попыток входа. Повторите через 15 минут.",
    },
  });
  for (const [path, method] of [
    ["/register", "register"],
    ["/login", "login"],
  ]) {
    router.post(path, credentialsLimiter, async (request, response, next) => {
      try {
        const { user, token, maxAge } = await authService[method](request.body);
        // Повторный вход в этом браузере отзывает его предыдущую сессию.
        await authService.logout(request.sessionId);
        response.cookie(SESSION_COOKIE, token, {
          ...sessionCookieOptions(config),
          maxAge,
        });
        response.status(method === "register" ? 201 : 200).json({ user });
      } catch (error) {
        if (error.status)
          return response.status(error.status).json({ error: error.message });
        next(error);
      }
    });
  }
  router.post("/logout", async (request, response, next) => {
    try {
      await authService.logout(request.sessionId);
      response.clearCookie(SESSION_COOKIE, sessionCookieOptions(config));
      response.json({ user: null });
    } catch (error) {
      next(error);
    }
  });
  router.patch("/profile", async (request, response, next) => {
    if (!request.user)
      return response.status(401).json({ error: "Сначала войдите в аккаунт." });
    try {
      response.json({
        user: await authService.changeGroup(
          request.user,
          request.body?.groupCode,
        ),
      });
    } catch (error) {
      if (error.status)
        return response.status(error.status).json({ error: error.message });
      next(error);
    }
  });
  return router;
}
