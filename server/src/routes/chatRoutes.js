import { Router } from "express";
import {
  normalizeGroupCode,
  normalizeMessages,
} from "../utils/requestValidation.js";
import { handleDatabaseError } from "./campusRoutes.js";

export function createChatRouter({ assistantService, config }) {
  const router = Router();

  router.post("/chat", async (request, response) => {
    const messages = normalizeMessages(request.body);
    const groupCode = normalizeGroupCode(
      request.body?.context?.groupCode,
      config.defaultGroupCode,
    );

    if (messages.length === 0 || messages.at(-1)?.role !== "user") {
      response.status(400).json({ error: "Добавьте вопрос пользователя." });
      return;
    }

    if (!groupCode) {
      response.status(400).json({ error: "Некорректный номер учебной группы." });
      return;
    }

    try {
      const answer = await assistantService.answer({ messages, groupCode });
      response.json(answer);
    } catch (error) {
      if (error.code === "AI_NOT_CONFIGURED") {
        response.status(503).json({
          error: "ИИ-модель ещё не настроена. Укажите MISTRAL_API_KEY на сервере.",
        });
        return;
      }

      if (error.code === "AI_REQUEST_FAILED") {
        response.status(502).json({
          error: "ИИ-сервис временно недоступен. Попробуйте ещё раз позднее.",
        });
        return;
      }

      handleDatabaseError(error, response, "Не удалось обработать вопрос.");
    }
  });

  return router;
}
