import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeFeedback,
  normalizeGroupCode,
  normalizeMessages,
} from "../src/utils/requestValidation.js";

test("normalizeMessages keeps valid recent messages", () => {
  const messages = normalizeMessages({
    messages: [
      { role: "system", content: "ignore" },
      { role: "user", content: "  Где корпус?  " },
      { role: "assistant", content: "Ответ" },
    ],
  });

  assert.deepEqual(messages, [
    { role: "user", content: "Где корпус?" },
    { role: "assistant", content: "Ответ" },
  ]);
});

test("normalizeGroupCode accepts campus-style codes", () => {
  assert.equal(normalizeGroupCode(" 261-321 "), "261-321");
  assert.equal(normalizeGroupCode("main"), "");
});

test("normalizeFeedback rejects unknown ratings", () => {
  assert.equal(
    normalizeFeedback({ messageId: "message-1", rating: "excellent" }),
    null,
  );
  assert.deepEqual(
    normalizeFeedback({ messageId: "message-1", rating: "helpful" }),
    {
      messageId: "message-1",
      rating: "helpful",
      comment: null,
      intent: null,
      responseHadSources: null,
    },
  );
});
