import { createApp } from "./src/app.js";
import { config } from "./src/config.js";
import { createDatabase } from "./src/db/pool.js";
import { createCampusRepository } from "./src/repositories/campusRepository.js";
import { createNavigatorRepository } from "./src/repositories/navigatorRepository.js";
import { createAssistantService } from "./src/services/assistantService.js";
import { createOpenAiClient } from "./src/services/openAiClient.js";

const database = createDatabase(config.database);
const campusRepository = createCampusRepository(database, {
  timeZone: config.campusTimeZone,
  navigatorRepository: config.navigatorEnabled ? createNavigatorRepository(database) : null,
});
const aiClient = createOpenAiClient(config.openAi);
const assistantService = createAssistantService({
  campusRepository,
  aiClient,
  timeZone: config.campusTimeZone,
  useAi: config.assistantMode === "openai",
});

const app = createApp({ assistantService, campusRepository, config });

const server = app.listen(config.port, config.host, () => {
  console.log(`Campus API started on http://${config.host}:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal}: stopping Campus API`);

  server.close(async () => {
    await database.close();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
