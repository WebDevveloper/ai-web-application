const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function askAssistant(messages) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Something went wrong on the server.");
  }

  return data.answer;
}
