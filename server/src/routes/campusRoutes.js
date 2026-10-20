import { Router } from "express";
import { normalizeGroupCode } from "../utils/requestValidation.js";
import { getIsoDate, isIsoDate } from "../utils/dateTime.js";
import { validateSearchText } from "../repositories/navigatorRepository.js";

export function createCampusRouter({ campusRepository, config }) {
  const router = Router();

  router.get("/groups", async (_request, response) => {
    try {
      response.json({ groups: await campusRepository.getGroups() });
    } catch (error) {
      handleDatabaseError(error, response, "Не удалось загрузить группы.");
    }
  });

  router.get("/schedule/week", async (request, response) => {
    const groupCode =
      request.user?.groupCode ||
      normalizeGroupCode(request.query.groupCode, config.defaultGroupCode);
    const startDate =
      request.query.startDate ?? getIsoDate(new Date(), config.campusTimeZone);
    if (
      !groupCode ||
      !isIsoDate(startDate) ||
      startDate < "2000-01-01" ||
      startDate > "2099-12-25"
    )
      return response
        .status(400)
        .json({ error: "Проверьте группу и дату начала недели (2000–2099)." });
    try {
      response.json(
        await campusRepository.getScheduleWeek(groupCode, startDate),
      );
    } catch (error) {
      handleDatabaseError(error, response, "Не удалось загрузить неделю.");
    }
  });

  router.get("/schedule", async (request, response) => {
    const groupCode =
      request.user?.groupCode ||
      normalizeGroupCode(request.query.groupCode, config.defaultGroupCode);
    const studyDate =
      request.query.date ?? getIsoDate(new Date(), config.campusTimeZone);
    if (!groupCode || !isIsoDate(studyDate)) {
      response
        .status(400)
        .json({ error: "Проверьте группу и дату в формате ГГГГ-ММ-ДД." });
      return;
    }
    try {
      response.json({
        groupCode,
        date: studyDate,
        lessons: await campusRepository.getSchedule(groupCode, studyDate),
      });
    } catch (error) {
      handleDatabaseError(error, response, "Не удалось загрузить расписание.");
    }
  });

  for (const [route, method] of [
    ["/teachers", "findTeachers"],
    ["/rooms", "findRooms"],
  ]) {
    router.get(route, async (request, response) => {
      try {
        const query = validateSearchText(request.query.q);
        const status = await campusRepository.getNavigatorStatus();
        if (!status.enabled) {
          response
            .status(503)
            .json({ error: "Справочник навигатора ещё не подключён." });
          return;
        }
        response.json({ results: await campusRepository[method](query) });
      } catch (error) {
        handleDatabaseError(
          error,
          response,
          "Не удалось выполнить поиск в справочнике.",
        );
      }
    });
  }

  router.get("/dashboard", async (request, response) => {
    const groupCode =
      request.user?.groupCode ||
      normalizeGroupCode(request.query.groupCode, config.defaultGroupCode);

    if (!groupCode) {
      response
        .status(400)
        .json({ error: "Некорректный номер учебной группы." });
      return;
    }

    try {
      const dashboard = await campusRepository.getDashboard(groupCode);
      response.json(dashboard);
    } catch (error) {
      handleDatabaseError(
        error,
        response,
        "Не удалось загрузить данные кампуса.",
      );
    }
  });

  return router;
}

export function handleDatabaseError(error, response, fallbackMessage) {
  if (error.code === "INVALID_INPUT") {
    response.status(400).json({ error: error.message });
    return;
  }
  if (error.code === "NAVIGATOR_NOT_IMPORTED") {
    response
      .status(503)
      .json({ error: "Данные навигатора пока не загружены." });
    return;
  }
  if (error.code === "DATABASE_NOT_CONFIGURED") {
    response.status(503).json({
      error: "Сервис данных кампуса ещё не настроен.",
    });
    return;
  }

  console.error(fallbackMessage, error.message);
  response.status(503).json({ error: fallbackMessage });
}
