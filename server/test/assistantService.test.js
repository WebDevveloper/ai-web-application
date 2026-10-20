import assert from "node:assert/strict";
import test from "node:test";
import { createAssistantService } from "../src/services/assistantService.js";

function createRepository(overrides = {}) {
  return {
    getSchedule: async () => [],
    getDeadlines: async () => [],
    findLocations: async () => [],
    findDepartments: async () => [],
    searchKnowledge: async () => [],
    ...overrides,
  };
}

test("schedule questions are answered from PostgreSQL without calling AI", async () => {
  let requestedGroup;
  const campusRepository = createRepository({
    getSchedule: async (groupCode) => {
      requestedGroup = groupCode;
      return [
        {
          id: "lesson-1",
          subject: "Программирование",
          startTime: "10:00:00",
          endTime: "11:30:00",
          room: "101",
          building: "Корпус А",
          source: null,
        },
      ];
    },
  });
  const aiClient = {
    complete: async () => assert.fail("AI must not be called for a schedule"),
  };
  const service = createAssistantService({ campusRepository, aiClient });

  const result = await service.answer({
    messages: [{ role: "user", content: "Какие пары сегодня?" }],
    groupCode: "261-321",
  });

  assert.equal(requestedGroup, "261-321");
  assert.equal(result.answerType, "schedule");
  assert.match(result.answer, /Программирование/);
});

test("missing schedule points to the official schedule source", async () => {
  const campusRepository = createRepository({
    searchKnowledge: async () => [
      {
        sourceId: "schedule-source",
        sourceTitle: "Официальное расписание",
        sourceUrl: "https://example.edu/schedule",
        sourceUpdatedAt: "2026-10-13",
      },
    ],
  });
  const aiClient = {
    complete: async () => assert.fail("AI must not be called for a schedule"),
  };
  const service = createAssistantService({ campusRepository, aiClient });

  const result = await service.answer({
    messages: [{ role: "user", content: "Какие пары сегодня?" }],
    groupCode: "261-321",
  });

  assert.match(result.answer, /нет записей/);
  assert.equal(result.sources[0].title, "Официальное расписание");
});

test("knowledge questions send only retrieved context to AI", async () => {
  const campusRepository = createRepository({
    searchKnowledge: async () => [
      {
        id: "chunk-1",
        heading: "Справка",
        content: "Подтверждённая инструкция.",
        sectionPath: "Документы",
        sourceId: "source-1",
        sourceTitle: "Регламент",
        sourceUrl: "https://example.edu/regulation",
        sourceUpdatedAt: "2026-10-01",
      },
    ],
  });
  let modelRequest;
  const aiClient = {
    isConfigured: () => true,
    complete: async (request) => {
      modelRequest = request;
      return "Ответ по регламенту [1].";
    },
  };
  const service = createAssistantService({
    campusRepository,
    aiClient,
    useAi: true,
  });

  const result = await service.answer({
    messages: [{ role: "user", content: "Как получить справку?" }],
    groupCode: "261-321",
  });

  assert.match(modelRequest.messages.at(-1).content, /Подтверждённая инструкция/);
  assert.match(modelRequest.systemPrompt, /только сведения из блока/);
  assert.equal(result.sources[0].title, "Регламент");
});

test("assistant does not call AI when no verified source was found", async () => {
  const campusRepository = createRepository();
  const aiClient = {
    complete: async () => assert.fail("AI must not answer without sources"),
  };
  const service = createAssistantService({ campusRepository, aiClient });

  const result = await service.answer({
    messages: [{ role: "user", content: "Как получить неизвестную услугу?" }],
    groupCode: "261-321",
  });

  assert.equal(result.answerType, "not_found");
  assert.deepEqual(result.sources, []);
});

test("verified data mode answers from retrieved chunks without an API key", async () => {
  const campusRepository = createRepository({
    searchKnowledge: async () => [
      {
        id: "chunk-1",
        heading: "Поддержка LMS",
        content: "Официальный адрес поддержки: lms@example.edu.",
        sectionPath: "Цифровые сервисы / LMS",
        sourceId: "source-1",
        sourceTitle: "Официальная инструкция",
        sourceUrl: "https://example.edu/support",
        sourceUpdatedAt: "2026-10-13",
      },
    ],
  });
  const aiClient = {
    isConfigured: () => false,
    complete: async () => assert.fail("AI must not be called in verified data mode"),
  };
  const service = createAssistantService({
    campusRepository,
    aiClient,
    useAi: false,
  });

  const result = await service.answer({
    messages: [{ role: "user", content: "Как войти в LMS?" }],
    groupCode: "261-321",
  });

  assert.equal(result.answerType, "verified_data");
  assert.match(result.answer, /lms@example\.edu/);
  assert.equal(result.sources[0].title, "Официальная инструкция");
});

test("AI provider failure falls back to verified data", async () => {
  const campusRepository = createRepository({
    searchKnowledge: async () => [
      {
        id: "chunk-1",
        heading: "Справка",
        content: "Подтверждённая инструкция.",
        sourceId: "source-1",
        sourceTitle: "Регламент",
      },
    ],
  });
  const aiClient = {
    isConfigured: () => true,
    complete: async () => {
      const error = new Error("Provider unavailable");
      error.code = "AI_REQUEST_FAILED";
      throw error;
    },
  };
  const service = createAssistantService({
    campusRepository,
    aiClient,
    useAi: true,
  });

  const result = await service.answer({
    messages: [{ role: "user", content: "Как получить справку?" }],
    groupCode: "261-321",
  });

  assert.equal(result.answerType, "verified_data");
  assert.match(result.answer, /Подтверждённая инструкция/);
});
