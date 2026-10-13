import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { createDatabase } from "./pool.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, "../../db/migrations");
const database = createDatabase(config.database);

async function migrate() {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  await database.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       file_name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );

  const appliedResult = await database.query(
    "SELECT file_name FROM schema_migrations",
  );
  const appliedFiles = new Set(appliedResult.rows.map((row) => row.file_name));

  for (const fileName of migrationFiles) {
    if (appliedFiles.has(fileName)) {
      console.log(`Already applied: ${fileName}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, fileName), "utf8");

    await database.withTransaction(async (client) => {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (file_name) VALUES ($1)",
        [fileName],
      );
    });

    console.log(`Applied: ${fileName}`);
  }
}

try {
  await migrate();
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await database.close();
}
