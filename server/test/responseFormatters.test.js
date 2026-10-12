import assert from "node:assert/strict";
import test from "node:test";
import {
  collectSources,
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
