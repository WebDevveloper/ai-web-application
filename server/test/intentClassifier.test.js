import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyIntent,
  extractSearchTerms,
  resolveStudyDate,
} from "../src/services/intentClassifier.js";

test("classifyIntent recognizes deterministic campus scenarios", () => {
  assert.equal(classifyIntent("Какие пары у меня завтра?"), "schedule");
  assert.equal(classifyIntent("Что сдать до конца недели?"), "deadline");
  assert.equal(classifyIntent("Где находится учебный офис?"), "contact");
  assert.equal(classifyIntent("Как пройти в корпус А?"), "location");
  assert.equal(classifyIntent("Как оформить академический отпуск?"), "knowledge");
});

test("extractSearchTerms keeps a short building identifier", () => {
  assert.deepEqual(extractSearchTerms("Как пройти в корпус А?"), [
    "корпус а",
    "пройти",
    "корпус",
  ]);
});

test("resolveStudyDate handles tomorrow in campus time", () => {
  const now = new Date("2026-10-12T10:00:00.000Z");
  assert.equal(
    resolveStudyDate("Расписание на завтра", now, "Europe/Moscow"),
    "2026-10-13",
  );
});

test("даты расписания не подменяются сегодняшним днём", () => {
  const now = new Date("2026-10-12T22:30:00Z");
  assert.equal(resolveStudyDate("Послезавтра", now), "2026-10-15");
  assert.equal(resolveStudyDate("Расписание на 2026-11-09", now), "2026-11-09");
  assert.throws(() => resolveStudyDate("Расписание на 2026-02-30", now), { code: "INVALID_INPUT" });
  assert.equal(classifyIntent("Почта преподавателя Зайцев"), "teacher");
});
