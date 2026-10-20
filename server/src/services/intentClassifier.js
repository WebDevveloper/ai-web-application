import { addDays, getIsoDate, isIsoDate } from "../utils/dateTime.js";

const INTENT_PATTERNS = {
  deadline:
    /дедлайн|срок|когда\s+(сдать|сдавать)|до\s+какого|что\s+сдать|конц[ае]\s+недел/i,
  schedule: /расписан|занят|пар[аыуе]|во\s+сколько|какие\s+предмет/i,
  teacher: /преподавател|препод\b|доцент|профессор/i,
  contact:
    /куда\s+обрат|к\s+кому|контакт|телефон|почт[аые]|деканат|учебн[а-яё]*\s+офис|поддержк/i,
  location:
    /где\s+(наход|располож)|как\s+(пройти|добраться|найти)|корпус|аудитори|кабинет|маршрут/i,
};

const SEARCH_STOP_WORDS = new Set([
  "где",
  "как",
  "какой",
  "какая",
  "какие",
  "куда",
  "кому",
  "мне",
  "мой",
  "моя",
  "мои",
  "можно",
  "находится",
  "нужно",
  "обратиться",
  "подскажите",
  "пожалуйста",
  "расположен",
  "этот",
  "эта",
]);

export function classifyIntent(question) {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(question)) {
      return intent;
    }
  }

  return "knowledge";
}

export function extractSearchTerms(question) {
  const locationIdentifier = question.match(
    /(?:корпус|аудитори[яию]|кабинет)\s+[a-zа-яё0-9-]+/iu,
  )?.[0];
  const terms = question
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9-]+/giu, " ")
    .split(/\s+/)
    .filter(
      (term) =>
        term.length >= 2 && !SEARCH_STOP_WORDS.has(term) && !/^\d+$/.test(term),
    );

  return [
    ...new Set(
      [locationIdentifier?.toLocaleLowerCase("ru-RU"), ...terms].filter(
        Boolean,
      ),
    ),
  ].slice(0, 8);
}

export function extractTeacherQuery(question) {
  const name = question.match(
    /(?:преподавател[а-яё]*|препод|доцент[а-яё]*|профессор[а-яё]*)\s+([а-яё-]{2,})/iu,
  )?.[1];
  return name || null;
}

export function resolveStudyDate(
  question,
  now = new Date(),
  timeZone = "Europe/Moscow",
) {
  const today = getIsoDate(now, timeZone);
  const explicitDate = question.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (explicitDate) {
    if (!isIsoDate(explicitDate)) {
      const error = new Error(
        "Такой даты не существует. Используйте ГГГГ-ММ-ДД.",
      );
      error.code = "INVALID_INPUT";
      throw error;
    }
    return explicitDate;
  }
  if (/послезавтра/i.test(question)) return addDays(today, 2);
  return /завтра/i.test(question) ? addDays(today, 1) : today;
}

export function resolveStudyWeek(
  question,
  now = new Date(),
  timeZone = "Europe/Moscow",
) {
  if (!/недел/i.test(question)) return null;
  const date = resolveStudyDate(question, now, timeZone);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  let offset = 0;
  if (/следующ[а-яё]*\s+недел/i.test(question)) offset = 7;
  if (/прошл[а-яё]*\s+недел/i.test(question)) offset = -7;
  return addDays(date, 1 - weekday + offset);
}
