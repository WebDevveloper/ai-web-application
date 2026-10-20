import { apiRequest } from "./http";

export function searchDirectory(kind, query) {
  const route = kind === "teachers" ? "teachers" : "rooms";
  return apiRequest(`/${route}?${new URLSearchParams({ q: query })}`);
}
export function getDashboard(groupCode) {
  return apiRequest(`/dashboard?${new URLSearchParams({ groupCode })}`);
}
export function getGroups() {
  return apiRequest("/groups");
}
export function getScheduleWeek(groupCode, startDate) {
  return apiRequest(
    `/schedule/week?${new URLSearchParams({ groupCode, startDate })}`,
  );
}
export function sendFeedback(payload) {
  return apiRequest("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
