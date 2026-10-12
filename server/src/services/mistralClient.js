const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export function createMistralClient({ apiKey, model, timeoutMs }) {
  return {
    async complete({ systemPrompt, messages }) {
      if (!apiKey) {
        const error = new Error("MISTRAL_API_KEY is not configured.");
        error.code = "AI_NOT_CONFIGURED";
        throw error;
      }

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);

      try {
        const response = await fetch(MISTRAL_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
          }),
          signal: abortController.signal,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("Mistral API returned status", response.status);
          const error = new Error(data?.message || "Mistral request failed.");
          error.code = "AI_REQUEST_FAILED";
          throw error;
        }

        const answer = data?.choices?.[0]?.message?.content?.trim();

        if (!answer) {
          const error = new Error("Mistral returned an empty answer.");
          error.code = "AI_REQUEST_FAILED";
          throw error;
        }

        return answer;
      } catch (error) {
        if (error.code === "AI_REQUEST_FAILED") {
          throw error;
        }

        const requestError = new Error("Mistral request failed.");
        requestError.code = "AI_REQUEST_FAILED";
        requestError.cause = error;
        throw requestError;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
