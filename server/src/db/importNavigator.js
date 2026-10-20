import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { createDatabase } from "./pool.js";
import { importNavigatorDump } from "./navigatorImport.js";

const database = createDatabase(config.database);
try {
  const fileIndex = process.argv.indexOf("--file");
  const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : null;
  if (!file || file.startsWith("--"))
    throw new Error("Укажите --file с путём к SQL-дампу");
  const filePath = path.resolve(file);
  if ((await stat(filePath)).size > 50 * 1024 * 1024)
    throw new Error("Дамп превышает 50 МБ");
  const rowCounts = await importNavigatorDump(
    database,
    await readFile(filePath, "utf8"),
    {
      fileName: path.basename(filePath),
      replace: process.argv.includes("--replace"),
    },
  );
  console.log("Данные навигатора загружены:", rowCounts);
} catch (error) {
  console.error("Не удалось импортировать навигатор:", error.message);
  process.exitCode = 1;
} finally {
  await database.close();
}
