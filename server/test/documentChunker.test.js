import assert from "node:assert/strict";
import test from "node:test";
import { chunkDocument } from "../src/services/documentChunker.js";

test("chunkDocument preserves Markdown section headings", () => {
  const chunks = chunkDocument(
    "# Справки\nТекст о справках.\n\n## Сроки\nТекст о сроках.",
    "Документ",
  );

  assert.deepEqual(
    chunks.map(({ heading, content, chunkOrder }) => ({
      heading,
      content,
      chunkOrder,
    })),
    [
      { heading: "Справки", content: "Текст о справках.", chunkOrder: 0 },
      { heading: "Сроки", content: "Текст о сроках.", chunkOrder: 1 },
    ],
  );
});

test("chunkDocument splits oversized sections", () => {
  const chunks = chunkDocument("слово ".repeat(80), "Раздел", 120);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.content.length <= 120));
});
