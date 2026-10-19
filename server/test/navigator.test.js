import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import {
  NAVIGATOR_COLUMNS,
  importNavigatorDump,
  parseNavigatorDump,
} from "../src/db/navigatorImport.js";
import { createNavigatorRepository } from "../src/repositories/navigatorRepository.js";
import { createCampusRepository } from "../src/repositories/campusRepository.js";
import { createAssistantService } from "../src/services/assistantService.js";
import { createApp } from "../src/app.js";

function fixtureDump({ invalidTeacher = false } = {}) {
  const data = {
    dim_buildings: [
      [
        "БС",
        "А, Б, Д",
        "Главный корпус",
        "Семёновская, 38",
        null,
        "Метро",
        null,
        "БС",
      ],
    ],
    dim_groups: [
      ["261-321", 1, "f", "2026-09-01", "2027-01-10", "t", "f", "f", "t"],
    ],
    dim_lesson_types: [["Лекция", "f", null]],
    dim_pair_times: [[0, 1, "09:00", "10:30", null]],
    dim_rooms: [
      [1, "БС", "БС", "Д108", "БС"],
      [2, "БС", "БС", "Д_10%", "БС"],
    ],
    dim_subjects: [[1, "Алгебра"]],
    dim_teachers: [[1, "Зайцев Алексей", null, null, null, null]],
    fact_lessons: [
      [
        1,
        "261-321",
        1,
        invalidTeacher ? 999 : 1,
        1,
        "Лекция",
        "1",
        "БС",
        "Д108",
        "2026-10-01",
        "2026-11-08",
        "f",
      ],
      [
        2,
        "261-321",
        1,
        null,
        1,
        "Лекция",
        "1",
        "БС",
        "Д108",
        "2026-11-09",
        "2026-12-01",
        "f",
      ],
      [
        3,
        "261-321",
        1,
        null,
        9,
        "Лекция",
        "1",
        "БС",
        null,
        "2026-10-01",
        "2026-11-08",
        "f",
      ],
      [
        4,
        "261-321",
        1,
        1,
        1,
        "Лекция",
        "2026-10-20",
        "БС",
        "Д108",
        null,
        null,
        "t",
      ],
    ],
    rel_teacher_subjects: [[1, 1]],
  };
  const escape = (value) =>
    value === null
      ? "\\N"
      : String(value)
          .replaceAll("\\", "\\\\")
          .replaceAll("\t", "\\t")
          .replaceAll("\n", "\\n");
  return Object.entries(NAVIGATOR_COLUMNS)
    .map(
      ([table, columns]) =>
        `COPY public.${table} (${columns.map((column) => `"${column}"`).join(", ")}) FROM stdin;\n${data[table].map((row) => row.map(escape).join("\t")).join("\n")}\n\\.`,
    )
    .join("\n\n");
}

test("миграция, импорт, SQL и API навигатора во встроенном PostgreSQL", async (context) => {
  const postgres = new PGlite();
  context.after(() => postgres.close());
  await postgres.exec(
    await readFile(
      new URL("../db/migrations/002_navigator.sql", import.meta.url),
      "utf8",
    ),
  );
  // Таблица приложения нужна для доказательства, что импорт её не меняет.
  await postgres.exec(
    "CREATE TABLE public.import_guard (value text); INSERT INTO public.import_guard VALUES ('keep')",
  );
  const database = {
    query: (sql, params) => postgres.query(sql, params),
    withTransaction: (callback) => postgres.transaction(callback),
    ping: async () => true,
  };
  const navigator = createNavigatorRepository(database);
  const options = { fileName: "fixture.sql" };

  await context.test(
    "до импорта не выдаёт отсутствие снимка за пустое расписание",
    async () => {
      await assert.rejects(
        () => navigator.getSchedule("261-321", "2026-10-19"),
        { code: "NAVIGATOR_NOT_IMPORTED" },
      );
    },
  );

  await context.test(
    "читает только данные COPY, не исполняя команды дампа",
    async () => {
      const dump = `DROP SCHEMA public CASCADE;\n${fixtureDump()}`;
      const counts = await importNavigatorDump(database, dump, options);
      assert.equal(counts.fact_lessons, 4);
      assert.equal(
        (await postgres.query("SELECT value FROM public.import_guard")).rows[0]
          .value,
        "keep",
      );
      assert.ok((await navigator.getStatus()).importedAt);
    },
  );

  await context.test(
    "выбирает день и интервал, сохраняет NULL, отдельно выбирает экзамен",
    async () => {
      const lessons = await navigator.getSchedule("261-321", "2026-10-19");
      assert.deepEqual(
        lessons.map((lesson) => lesson.id),
        ["navigator-1", "navigator-3"],
      );
      assert.equal(lessons[1].startTime, null);
      assert.equal(lessons[0].source.type, "snapshot");
      assert.equal(lessons[0].source.updatedAt, null);
      assert.equal(
        (await navigator.getSchedule("261-321", "2026-10-20"))[0].isSession,
        true,
      );
      assert.deepEqual(
        await navigator.getSchedule("261-321", "2026-10-25"),
        [],
      );
      assert.deepEqual(
        (await navigator.getSchedule("261-321", "2026-11-09")).map(
          (lesson) => lesson.id,
        ),
        ["navigator-2"],
      );
      await assert.rejects(
        () => navigator.getSchedule("261-321", "2026-02-30"),
        { code: "INVALID_INPUT" },
      );
    },
  );

  await context.test(
    "поиск преподавателя и аудитории работает с кириллицей и литеральным LIKE",
    async () => {
      const teachers = await navigator.findTeachers("Зайцев");
      assert.equal(teachers[0].email, null);
      assert.deepEqual(teachers[0].subjects, ["Алгебра"]);
      assert.equal((await navigator.findRooms("Д_10%"))[0].room, "Д_10%");
      assert.deepEqual(
        await navigator.findTeachers(
          "'; DROP TABLE navigator.dim_teachers; --",
        ),
        [],
      );
      assert.equal(
        (await navigator.findLocations(["корпус д"]))[0].name,
        "Главный корпус",
      );
      assert.equal(
        (await navigator.findLocations(["аудитория д108", "д108"]))[0].room,
        "Д108",
      );
      await assert.rejects(() => navigator.findTeachers(" "), {
        code: "INVALID_INPUT",
      });
    },
  );

  await context.test(
    "повторная загрузка требует --replace; плохая ссылка откатывает весь снимок",
    async () => {
      const before = await navigator.getStatus();
      await assert.rejects(
        () => importNavigatorDump(database, fixtureDump(), options),
        /--replace/,
      );
      await assert.rejects(
        () =>
          importNavigatorDump(database, fixtureDump({ invalidTeacher: true }), {
            ...options,
            replace: true,
          }),
        /foreign key/,
      );
      assert.equal(
        (await navigator.getSchedule("261-321", "2026-10-19")).length,
        2,
      );
      assert.deepEqual(await navigator.getStatus(), before);
      await importNavigatorDump(database, fixtureDump(), {
        ...options,
        replace: true,
      });
      assert.equal(
        (
          await postgres.query(
            "SELECT count(*)::int AS count FROM navigator.fact_lessons",
          )
        ).rows[0].count,
        4,
      );
    },
  );

  await context.test(
    "не принимает неизвестные COPY-таблицы и оборванный файл",
    () => {
      assert.throws(
        () =>
          parseNavigatorDump("COPY public.feedback (id) FROM stdin;\n1\n\\."),
        /неизвестную/,
      );
      assert.throws(
        () => parseNavigatorDump(fixtureDump().slice(0, -3)),
        /неполный/,
      );
    },
  );

  await context.test(
    "сохраняет UTF-8, табуляции и отличает пустую строку от NULL",
    () => {
      const encodedName = [...Buffer.from("Зайцев Алексей\t", "utf8")]
        .map((byte) => `\\${byte.toString(8).padStart(3, "0")}`)
        .join("");
      const parsed = parseNavigatorDump(
        fixtureDump().replace("Зайцев Алексей", encodedName),
      );
      assert.equal(parsed.get("dim_teachers")[0][1], "Зайцев Алексей\t");
      assert.equal(parsed.get("dim_teachers")[0][2], null);
      const empty = parseNavigatorDump(
        fixtureDump().replace("Зайцев Алексей", ""),
      );
      assert.equal(empty.get("dim_teachers")[0][1], "");
    },
  );

  await context.test(
    "чат и HTTP используют импортированные данные без LLM",
    async (apiContext) => {
      const campus = createCampusRepository(database, {
        navigatorRepository: navigator,
      });
      const assistant = createAssistantService({
        campusRepository: campus,
        aiClient: { complete: () => assert.fail("LLM не нужен") },
      });
      const schedule = await assistant.answer({
        messages: [{ role: "user", content: "Расписание на 2026-10-19" }],
        groupCode: "261-321",
      });
      assert.match(schedule.answer, /Время уточняется/);
      const teacher = await assistant.answer({
        messages: [{ role: "user", content: "Преподаватель Зайцев" }],
        groupCode: "261-321",
      });
      assert.match(teacher.answer, /Email не указан/);
      const app = createApp({
        assistantService: assistant,
        campusRepository: campus,
        config: {
          clientOrigins: ["http://localhost:5173"],
          defaultGroupCode: "261-321",
        },
      });
      const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
      });
      apiContext.after(() => new Promise((resolve) => server.close(resolve)));
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const response = await fetch(
        `${baseUrl}/api/teachers?q=${encodeURIComponent("Зайцев")}`,
      );
      assert.equal(response.status, 200);
      assert.equal(
        (await response.json()).results[0].fullName,
        "Зайцев Алексей",
      );
      const scheduleResponse = await fetch(`${baseUrl}/api/schedule?groupCode=261-321&date=2026-10-19`);
      assert.equal(scheduleResponse.status, 200);
      assert.equal((await scheduleResponse.json()).lessons.length, 2);
      const roomResponse = await fetch(`${baseUrl}/api/rooms?q=${encodeURIComponent("Д108")}`);
      assert.equal(roomResponse.status, 200);
      assert.equal((await roomResponse.json()).results[0].room, "Д108");
      assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
      assert.equal((await fetch(`${baseUrl}/api/rooms?q=%20`)).status, 400);
      assert.equal(
        (await fetch(`${baseUrl}/api/schedule?date=2026-02-30`)).status,
        400,
      );
      const denied = await fetch(`${baseUrl}/api/teachers?q=test`, {
        headers: { Origin: "https://not-allowed.example" },
      });
      assert.equal(denied.status, 403);
    },
  );
});

test(
  "полный внешний дамп сохраняет данные приложения и доступен через dashboard",
  {
    skip: !process.env.NAVIGATOR_TEST_DUMP_PATH,
  },
  async (context) => {
    const postgres = new PGlite({ extensions: { pgcrypto } });
    context.after(() => postgres.close());
    for (const migration of ["001_initial_schema.sql", "002_navigator.sql"]) {
      await postgres.exec(
        await readFile(
          new URL(`../db/migrations/${migration}`, import.meta.url),
          "utf8",
        ),
      );
    }
    await postgres.exec(
      await readFile(new URL("../db/seed.sql", import.meta.url), "utf8"),
    );
    const before = (
      await postgres.query(
        "SELECT count(*)::int AS count FROM public.knowledge_chunks",
      )
    ).rows[0].count;
    const database = {
      query: (sql, params) => postgres.query(sql, params),
      withTransaction: (callback) => postgres.transaction(callback),
      ping: async () => true,
    };
    const dump = await readFile(process.env.NAVIGATOR_TEST_DUMP_PATH, "utf8");
    const expectedCounts = Object.fromEntries(
      [...parseNavigatorDump(dump)].map(([table, rows]) => [
        table,
        rows.length,
      ]),
    );
    const importedCounts = await importNavigatorDump(database, dump, {
      fileName: "external-test.sql",
    });
    assert.deepEqual(importedCounts, expectedCounts);
    for (const [table, count] of Object.entries(expectedCounts)) {
      const result = await postgres.query(
        `SELECT count(*)::int AS count FROM navigator.${table}`,
      );
      assert.equal(result.rows[0].count, count);
    }
    const after = (
      await postgres.query(
        "SELECT count(*)::int AS count FROM public.knowledge_chunks",
      )
    ).rows[0].count;
    assert.equal(after, before);
    const navigator = createNavigatorRepository(database);
    const campus = createCampusRepository(database, {
      navigatorRepository: navigator,
    });
    const dashboard = await campus.getDashboard("261-321");
    assert.equal(dashboard.navigator.enabled, true);
    assert.ok(dashboard.navigator.importedAt);
    assert.ok(dashboard.locations.length > 0);
    assert.ok((await navigator.findTeachers("Зайцев")).length > 0);
    assert.ok((await campus.searchKnowledge("справка")).length > 0);
  },
);
