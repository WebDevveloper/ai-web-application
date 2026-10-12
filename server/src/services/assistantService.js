import { buildCampusPrompt } from "../prompts/campusPrompt.js";
import {
  classifyIntent,
  extractSearchTerms,
  resolveStudyDate,
} from "./intentClassifier.js";
import {
  formatContactResponse,
  formatDeadlineResponse,
  formatLocationResponse,
  formatScheduleResponse,
  sourcesFromKnowledge,
} from "./responseFormatters.js";

export function createAssistantService({
  campusRepository,
  mistralClient,
  timeZone = "Europe/Moscow",
}) {
  return {
    async answer({ messages, groupCode }) {
      const question = messages.at(-1).content;
      const intent = classifyIntent(question);

      if (intent === "schedule") {
        const studyDate = resolveStudyDate(question, new Date(), timeZone);
        const entries = await campusRepository.getSchedule(groupCode, studyDate);
        return formatScheduleResponse(entries, studyDate);
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

      const { systemPrompt, userPrompt } = buildCampusPrompt({
        question,
        chunks,
        groupCode,
      });
      const answer = await mistralClient.complete({
        systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      return {
        answer,
        answerType: "knowledge",
        sources: sourcesFromKnowledge(chunks),
        actions: [],
      };
    },
  };
}
