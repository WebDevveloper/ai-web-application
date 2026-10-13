import { addDays, getIsoDate } from "../utils/dateTime.js";

const INTENT_PATTERNS = {
  deadline: /дедлайн|срок|когда\s+(сдать|сдавать)|до\s+какого|что\s+сдать|конц[ае]\s+недел/i,
  schedule: /расписан|занят|пар[аыуе]|во\s+сколько|какие\s+предмет/i,
  contact: /куда\s+обрат|к\s+кому|контакт|телефон|почт[аые]|деканат|учебн[а-яё]*\s+офис|поддержк/i,
  location: /где\s+(наход|располож)|как\s+(пройти|добраться|найти)|корпус|аудитори|кабинет|маршрут/i,
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
    ...new Set([
      locationIdentifier?.toLocaleLowerCase("ru-RU"),
      ...terms,
    ].filter(Boolean)),
  ].slice(0, 8);
}

export function resolveStudyDate(
  question,
  now = new Date(),
  timeZone = "Europe/Moscow",
) {
  const today = getIsoDate(now, timeZone);
  return /завтра/i.test(question) ? addDays(today, 1) : today;
}
