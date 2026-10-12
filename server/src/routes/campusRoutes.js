import { Router } from "express";
import { normalizeGroupCode } from "../utils/requestValidation.js";

export function createCampusRouter({ campusRepository, config }) {
  const router = Router();

  router.get("/dashboard", async (request, response) => {
    const groupCode = normalizeGroupCode(
      request.query.groupCode,
      config.defaultGroupCode,
    );

    if (!groupCode) {
      response.status(400).json({ error: "Некорректный номер учебной группы." });
      return;
    }

    try {
      const dashboard = await campusRepository.getDashboard(groupCode);
      response.json(dashboard);
    } catch (error) {
      handleDatabaseError(error, response, "Не удалось загрузить данные кампуса.");
    }
  });

  return router;
}

export function handleDatabaseError(error, response, fallbackMessage) {
  if (error.code === "DATABASE_NOT_CONFIGURED") {
    response.status(503).json({
      error: "База данных ещё не настроена. Укажите DATABASE_URL на сервере.",
    });
    return;
  }

  console.error(fallbackMessage, error);
  response.status(500).json({ error: fallbackMessage });
}
