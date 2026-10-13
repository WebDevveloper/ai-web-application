import OpenAI from "openai";

export function createOpenAiClient({
  apiKey,
  model,
  timeoutMs,
  maxOutputTokens,
  reasoningEffort,
}) {
  // Создаём клиент один раз при запуске backend, а не при каждом вопросе.
  const client = apiKey
    ? new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 1 })
    : null;

  return {
    isConfigured() {
      return Boolean(client);
    },
    async complete({ systemPrompt, messages }) {
      if (!client) {
        const error = new Error("OPENAI_API_KEY is not configured.");
        error.code = "AI_NOT_CONFIGURED";
        throw error;
      }

      try {
        const response = await client.responses.create({
          model,
          instructions: systemPrompt,
          input: messages,
          reasoning: { effort: reasoningEffort },
          max_output_tokens: maxOutputTokens,
          // Ответ не нужен как сохранённый объект Responses API.
          store: false,
        });
        const answer = response.output_text?.trim();

        if (!answer) {
          console.error(
            "OpenAI returned no answer",
            response.incomplete_details?.reason || response.status,
          );
          const error = new Error("OpenAI returned an empty answer.");
          error.code = "AI_REQUEST_FAILED";
          throw error;
        }

        return answer;
      } catch (error) {
        if (error.code === "AI_REQUEST_FAILED") {
          throw error;
        }

        console.error("OpenAI API request failed", {
          status: error.status,
          code: error.code,
          type: error.type,
        });
        const requestError = new Error("OpenAI request failed.");
        requestError.code = "AI_REQUEST_FAILED";
        requestError.cause = error;
        throw requestError;
      }
    },
  };
}
