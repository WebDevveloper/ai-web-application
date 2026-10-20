// Пустая строка означает запросы к /api через proxy на том же домене.
const defaultApiUrl = import.meta.env.DEV ? "http://localhost:3000" : "";
const API_URL = (import.meta.env.VITE_API_URL ?? defaultApiUrl).replace(
  /\/$/,
  "",
);

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json", "X-Campus-Request": "1" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/login"))
      window.dispatchEvent(new Event("campus-session-expired"));
    throw new Error(data?.error || "Сервис кампуса временно недоступен.");
  }
  if (!data || typeof data !== "object")
    throw new Error("Сервис кампуса вернул некорректный ответ.");
  return data;
}
