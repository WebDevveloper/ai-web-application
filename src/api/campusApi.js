const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function readJson(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Сервис кампуса временно недоступен.");
  }

  return data;
}

export async function getDashboard(groupCode) {
  const searchParams = new URLSearchParams({ groupCode });
  const response = await fetch(`${API_URL}/api/dashboard?${searchParams}`);
  return readJson(response);
}

export async function sendFeedback(payload) {
  const response = await fetch(`${API_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(response);
}
