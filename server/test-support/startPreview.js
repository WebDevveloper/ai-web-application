// Только локальный стенд для UI/e2e. Рабочая DATABASE_URL здесь не используется.
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { createApp } from "../src/app.js";
import { createCampusRepository } from "../src/repositories/campusRepository.js";
import { createNavigatorRepository } from "../src/repositories/navigatorRepository.js";
import { createUserRepository } from "../src/repositories/userRepository.js";
import { createAuthService } from "../src/services/authService.js";
import { createAssistantService } from "../src/services/assistantService.js";
import { getIsoDate } from "../src/utils/dateTime.js";
import { importNavigatorDump } from "../src/db/navigatorImport.js";

const postgres = new PGlite({ extensions: { pgcrypto } });
for (const file of [
  "001_initial_schema.sql",
  "002_navigator.sql",
  "003_accounts.sql",
]) {
  await postgres.exec(
    await readFile(
      new URL(`../db/migrations/${file}`, import.meta.url),
      "utf8",
    ),
  );
}
const database = {
  query: (sql, params) => postgres.query(sql, params),
  withTransaction: (callback) => postgres.transaction(callback),
  ping: async () => true,
};
if (process.env.NAVIGATOR_TEST_DUMP_PATH) {
  await importNavigatorDump(
    database,
    await readFile(process.env.NAVIGATOR_TEST_DUMP_PATH, "utf8"),
    { fileName: "local-preview.sql" },
  );
} else {
  await postgres.exec(`
    INSERT INTO navigator.dim_groups(group_name,course,evening) VALUES ('261-321',1,false),('261-322',1,false);
    INSERT INTO navigator.dim_subjects VALUES(1,'Дискретная математика');
    INSERT INTO navigator.dim_buildings(building_id,name,address,transport) VALUES ('БС','Большая Семёновская','ул. Большая Семёновская, д. 38','м. Электрозаводская');
    INSERT INTO navigator.dim_rooms(room_id,room_as_in_source,building_id_by_location) VALUES (1,'А101','БС');
    INSERT INTO navigator.dim_teachers(teacher_id,full_name) VALUES (1,'Зайцев Алексей');
    INSERT INTO navigator.dim_pair_times(evening_code,pair_no,start_time,end_time) VALUES(0,1,'09:00','10:30');
    INSERT INTO navigator.import_state(file_name,row_counts) VALUES('test-fixture','{}');
  `);
  const today = getIsoDate();
  const weekday = String(new Date(`${today}T12:00:00Z`).getUTCDay() || 7);
  await postgres.query(
    `INSERT INTO navigator.fact_lessons(lesson_id,group_name,subject_id,teacher_id,pair_number,weekday_no_or_exam_date,location,auditory_titles,is_session) VALUES(1,'261-321',1,1,1,$1,'БС','А101',false)`,
    [weekday],
  );
}
const campusRepository = createCampusRepository(database, {
  navigatorRepository: createNavigatorRepository(database),
});
const authService = createAuthService({
  campusRepository,
  userRepository: createUserRepository(database),
  secret: randomBytes(48).toString("base64url"),
});
const assistantService = createAssistantService({
  campusRepository,
  aiClient: {},
});
const app = createApp({
  campusRepository,
  authService,
  assistantService,
  config: {
    clientOrigins: ["http://127.0.0.1:32201"],
    defaultGroupCode: "261-321",
    auth: { cookieSecure: false },
  },
});
const server = app.listen(32200, "127.0.0.1", () =>
  console.log("Локальный тестовый API: http://127.0.0.1:32200"),
);
function shutdown() {
  server.close(async () => {
    await postgres.close();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
