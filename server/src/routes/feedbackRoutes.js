import { Router } from "express";
import { normalizeFeedback } from "../utils/requestValidation.js";
import { handleDatabaseError } from "./campusRoutes.js";

export function createFeedbackRouter({ campusRepository }) {
  const router = Router();

  router.post("/feedback", async (request, response) => {
    const feedback = normalizeFeedback(request.body);

    if (!feedback) {
      response.status(400).json({ error: "Некорректная оценка ответа." });
      return;
    }

    try {
      await campusRepository.saveFeedback(feedback);
      response.status(201).json({ saved: true });
    } catch (error) {
      handleDatabaseError(error, response, "Не удалось сохранить оценку.");
    }
  });

  return router;
}
