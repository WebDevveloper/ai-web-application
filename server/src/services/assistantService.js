import { buildCampusPrompt } from "../prompts/campusPrompt.js";
import {
  classifyIntent,
  extractTeacherQuery,
  extractSearchTerms,
  resolveStudyDate,
} from "./intentClassifier.js";
import {
  formatContactResponse,
  formatDeadlineResponse,
  formatKnowledgeResponse,
  formatLocationResponse,
  formatScheduleResponse,
  formatTeacherResponse,
  sourcesFromKnowledge,
} from "./responseFormatters.js";

export function createAssistantService({
  campusRepository,
  aiClient,
  timeZone = "Europe/Moscow",
  useAi = false,
}) {
  return {
    async answer({ messages, groupCode }) {
      const question = messages.at(-1).content;
      const intent = classifyIntent(question);

      if (intent === "teacher") {
        const name = extractTeacherQuery(question);
        if (!name) return {
          answer: "Укажите фамилию, например: «Преподаватель Зайцев».",
          answerType: "teacher", sources: [], actions: [{ type: "teachers", label: "Поиск преподавателя" }],
        };
        const teachers = await campusRepository.findTeachers(name);
        return formatTeacherResponse(teachers);
      }

      if (intent === "schedule") {
        const studyDate = resolveStudyDate(question, new Date(), timeZone);
        const entries = await campusRepository.getSchedule(groupCode, studyDate);

        if (entries.length > 0) {
          return formatScheduleResponse(entries, studyDate);
        }

        const scheduleSources = await campusRepository.searchKnowledge(
          "официальное расписание",
        );
        return formatScheduleResponse(
          entries,
          studyDate,
          sourcesFromKnowledge(scheduleSources),
        );
      }

      if (intent === "deadline") {
        const deadlines = await campusRepository.getDeadlines(groupCode);
        return formatDeadlineResponse(deadlines, timeZone);
      }

      if (intent === "location") {
        const locations = await campusRepository.findLocations(
          extractSearchTerms(question),
        );
        return formatLocationResponse(locations);
      }

      if (intent === "contact") {
        const departments = await campusRepository.findDepartments(
          extractSearchTerms(question),
        );
        return formatContactResponse(departments);
      }

      const chunks = await campusRepository.searchKnowledge(question);

      if (chunks.length === 0) {
        return {
          answer:
            "В подключённых материалах я не нашёл подтверждённого ответа. Попробуйте уточнить формулировку или обратитесь в учебный офис.",
          answerType: "not_found",
          sources: [],
          actions: [{ type: "help", label: "Куда обратиться" }],
        };
      }

      // Базовый режим работает без внешнего API: он показывает найденные
      // официальные фрагменты без пересказа языковой моделью.
      if (!useAi || !aiClient.isConfigured?.()) {
        return formatKnowledgeResponse(chunks);
      }

      try {
        const { systemPrompt, userPrompt } = buildCampusPrompt({
          question,
          chunks,
          groupCode,
        });
        const answer = await aiClient.complete({
          systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        return {
          answer,
          answerType: "knowledge",
          sources: sourcesFromKnowledge(chunks),
          actions: [],
        };
      } catch (error) {
        // Сбой платного провайдера не должен ломать справочник кампуса.
        if (["AI_NOT_CONFIGURED", "AI_REQUEST_FAILED"].includes(error.code)) {
          return formatKnowledgeResponse(chunks);
        }

        throw error;
      }
    },
  };
}
