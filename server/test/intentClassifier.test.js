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
