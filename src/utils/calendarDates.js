export function campusToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function mondayOf(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  return shiftDate(date, 1 - weekday);
}
export function formatCalendarDate(date, options) {
  return new Intl.DateTimeFormat("ru-RU", {
    ...options,
    timeZone: "Europe/Moscow",
  }).format(new Date(`${date}T12:00:00Z`));
}
