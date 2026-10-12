import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { chunkDocument } from "../services/documentChunker.js";
import { createDatabase } from "./pool.js";

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireOption(name) {
  const value = readOption(name);

  if (!value || value.startsWith("--")) {
    throw new Error(`Required option is missing: ${name}`);
  }

  return value;
}

async function importKnowledge() {
  const filePath = path.resolve(requireOption("--file"));
  const extension = path.extname(filePath).toLocaleLowerCase();

  if (![".md", ".txt"].includes(extension)) {
    throw new Error("The MVP importer supports only .md and .txt files.");
  }

  const sourceKey = requireOption("--key");
  const title = requireOption("--title");
  const canonicalUrl = readOption("--url") || null;
  const ownerName = readOption("--owner") || null;
  const status = process.argv.includes("--verified") ? "verified" : "draft";
  const documentText = await readFile(filePath, "utf8");
  const chunks = chunkDocument(documentText, title);

  if (chunks.length === 0) {
    throw new Error("The source file does not contain text.");
  }

  const database = createDatabase(config.database);

  try {
    await database.withTransaction(async (client) => {
      const sourceResult = await client.query(
        `INSERT INTO knowledge_sources (
           source_key,
           title,
           canonical_url,
           source_type,
           owner_name,
           status,
           last_checked_at,
           metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7::JSONB)
         ON CONFLICT (source_key) DO UPDATE SET
           title = EXCLUDED.title,
           canonical_url = EXCLUDED.canonical_url,
           owner_name = EXCLUDED.owner_name,
           status = EXCLUDED.status,
           last_checked_at = EXCLUDED.last_checked_at,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
         RETURNING id`,
        [
          sourceKey,
          title,
          canonicalUrl,
          extension.slice(1),
          ownerName,
          status,
          JSON.stringify({ importedFileName: path.basename(filePath) }),
        ],
      );
      const sourceId = sourceResult.rows[0].id;

      await client.query("DELETE FROM knowledge_chunks WHERE source_id = $1", [
        sourceId,
      ]);

      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO knowledge_chunks (
             source_id,
             heading,
             content,
             section_path,
             chunk_order
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            sourceId,
            chunk.heading,
            chunk.content,
            chunk.sectionPath,
            chunk.chunkOrder,
          ],
        );
      }
    });

    console.log(
      `Imported ${chunks.length} chunks as ${status} source "${sourceKey}".`,
    );
  } finally {
    await database.close();
  }
}

try {
  await importKnowledge();
} catch (error) {
  console.error("Knowledge import failed:", error.message);
  process.exitCode = 1;
}
