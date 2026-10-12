const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function askAssistant(messages, context = {}) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Не удалось получить ответ от ассистента.");
  }

  return {
    answer: data?.answer || "Ассистент вернул пустой ответ.",
    answerType: data?.answerType || "general",
    sources: Array.isArray(data?.sources) ? data.sources : [],
    actions: Array.isArray(data?.actions) ? data.actions : [],
  };
}
