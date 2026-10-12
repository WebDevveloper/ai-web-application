import { createApp } from "./src/app.js";
import { config } from "./src/config.js";
import { createDatabase } from "./src/db/pool.js";
import { createCampusRepository } from "./src/repositories/campusRepository.js";
import { createAssistantService } from "./src/services/assistantService.js";
import { createMistralClient } from "./src/services/mistralClient.js";

const database = createDatabase(config.database);
const campusRepository = createCampusRepository(database, {
  timeZone: config.campusTimeZone,
});
const mistralClient = createMistralClient(config.mistral);
const assistantService = createAssistantService({
  campusRepository,
  mistralClient,
  timeZone: config.campusTimeZone,
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
