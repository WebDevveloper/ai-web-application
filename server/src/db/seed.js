import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { createDatabase } from "./pool.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(currentDirectory, "../../db/seed.sql");
const database = createDatabase(config.database);

try {
  const sql = await readFile(seedPath, "utf8");
  await database.withTransaction((client) => client.query(sql));
  console.log("Demo data loaded.");
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await database.close();
}
