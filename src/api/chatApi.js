import { apiRequest } from "./http";

export async function askAssistant(messages, context = {}) {
  const data = await apiRequest("/chat", {
    method: "POST",
    body: JSON.stringify({ messages, context }),
  });
  return {
    answer: data.answer || "Ассистент вернул пустой ответ.",
    answerType: data.answerType || "general",
    sources: Array.isArray(data.sources) ? data.sources : [],
    actions: Array.isArray(data.actions) ? data.actions : [],
  };
}
