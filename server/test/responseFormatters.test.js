import assert from "node:assert/strict";
import test from "node:test";
import {
  collectSources,
  formatKnowledgeResponse,
  formatLocationResponse,
} from "../src/services/responseFormatters.js";

test("collectSources removes duplicate source cards", () => {
  const source = { id: "source-1", title: "Справочник" };
  assert.deepEqual(collectSources([{ source }, { source }]), [source]);
});

test("location response exposes a supported drawer action", () => {
  const response = formatLocationResponse([
    {
      name: "Корпус А",
      address: "Улица, 1",
      room: null,
      directions: "Вход со двора",
      source: null,
    },
  ]);

  assert.equal(response.answerType, "location");
  assert.equal(response.actions[0].type, "campus");
  assert.match(response.answer, /Вход со двора/);
});

test("formatKnowledgeResponse exposes official text and its source", () => {
  const response = formatKnowledgeResponse([
    {
      heading: "Справка",
      content: "Заполните заявление.",
      sourceId: "source-1",
      sourceTitle: "Официальная инструкция",
      sourceUrl: "https://example.edu/instruction",
    },
  ]);

  assert.equal(response.answerType, "verified_data");
  assert.match(response.answer, /Заполните заявление/);
  assert.equal(response.sources[0].title, "Официальная инструкция");
});
