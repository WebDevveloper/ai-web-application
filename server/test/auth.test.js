import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { createCampusRepository } from "../src/repositories/campusRepository.js";
import { createNavigatorRepository } from "../src/repositories/navigatorRepository.js";
import { createUserRepository } from "../src/repositories/userRepository.js";
import { createAuthService } from "../src/services/authService.js";
import { createAssistantService } from "../src/services/assistantService.js";
import { createApp } from "../src/app.js";
import { sessionCookieOptions } from "../src/routes/authRoutes.js";

const SECRET = "test-secret-used-only-in-isolated-tests-123456789";
const ORIGIN = "http://localhost:5173";

test("аккаунт, сессия и группа работают через HTTP и PostgreSQL", async (context) => {
  const postgres = new PGlite({ extensions: { pgcrypto } });
  context.after(() => postgres.close());
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
  await postgres.exec(`
    INSERT INTO navigator.dim_groups(group_name, course, evening) VALUES ('261-321',1,false), ('261-322',1,false), ('26А-111',1,false);
    INSERT INTO navigator.dim_subjects VALUES (1,'Алгебра'), (2,'Сети');
    INSERT INTO navigator.dim_pair_times(evening_code,pair_no,start_time,end_time) VALUES (0,1,'09:00','10:30');
    INSERT INTO navigator.fact_lessons(lesson_id,group_name,subject_id,pair_number,weekday_no_or_exam_date,date_from,date_to,is_session)
    VALUES (1,'261-321',1,1,'1','2026-10-01','2026-11-01',false), (2,'261-322',2,1,'1','2026-10-01','2026-11-01',false);
    INSERT INTO navigator.import_state(file_name,row_counts) VALUES ('test.sql','{}');
  `);
  const database = {
    query: (sql, params) => postgres.query(sql, params),
    withTransaction: (callback) => postgres.transaction(callback),
    ping: async () => true,
  };
  const campusRepository = createCampusRepository(database, {
    navigatorRepository: createNavigatorRepository(database),
  });
  const userRepository = createUserRepository(database);
  const authService = createAuthService({
    userRepository,
    campusRepository,
    secret: SECRET,
  });
  const assistantService = createAssistantService({
    campusRepository,
    aiClient: {},
  });
  const config = {
    clientOrigins: [ORIGIN],
    defaultGroupCode: "261-321",
    auth: { cookieSecure: false },
  };
  const server = await new Promise((resolve) => {
    const listener = createApp({
      campusRepository,
      authService,
      assistantService,
      config,
    }).listen(0, "127.0.0.1", () => resolve(listener));
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(
    path,
    { body, cookie, method = body ? "POST" : "GET", header = true } = {},
  ) {
    return fetch(`${base}${path}`, {
      method,
      headers: {
        Origin: ORIGIN,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(header ? { "X-Campus-Request": "1" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const registration = {
    email: "Student@Example.com",
    displayName: "Артём",
    password: "separate-test-password",
    groupCode: "261-322",
  };
  let cookie;
  let user;

  await context.test(
    "список групп содержит буквенный номер, неизвестная группа не создаёт аккаунт",
    async () => {
      const groups = await (await request("/groups")).json();
      assert.ok(groups.groups.some((group) => group.code === "26А-111"));
      assert.equal(
        (
          await request("/auth/register", {
            body: { ...registration, groupCode: "999-999" },
          })
        ).status,
        400,
      );
      assert.equal(
        (await postgres.query("SELECT count(*)::int AS count FROM users"))
          .rows[0].count,
        0,
      );
    },
  );
  await context.test(
    "регистрация сохраняет bcrypt cost 12, отдаёт HttpOnly-cookie и безопасный профиль",
    async () => {
      const response = await request("/auth/register", { body: registration });
      assert.equal(response.status, 201);
      const header = response.headers.get("set-cookie");
      assert.match(header, /HttpOnly/);
      assert.match(header, /SameSite=Lax/);
      assert.match(header, /Path=\/api/);
      cookie = header.split(";")[0];
      const data = await response.json();
      user = data.user;
      assert.equal(user.email, "student@example.com");
      assert.equal(user.groupCode, "261-322");
      assert.equal(data.token, undefined);
      assert.equal(user.passwordHash, undefined);
      const row = (
        await postgres.query("SELECT password_hash FROM users WHERE id=$1", [
          user.id,
        ])
      ).rows[0];
      assert.equal(bcrypt.getRounds(row.password_hash), 12);
      assert.ok(await bcrypt.compare(registration.password, row.password_hash));
      const second = await request("/auth/register", {
        body: {
          ...registration,
          email: "second@example.com",
          groupCode: "26А-111",
        },
      });
      assert.equal(second.status, 201);
      const hashes = (
        await postgres.query("SELECT password_hash FROM users")
      ).rows.map((row) => row.password_hash);
      assert.notEqual(hashes[0], hashes[1]);
      assert.equal(
        (await request("/auth/me", { cookie })).headers.get("cache-control"),
        "no-store",
      );
    },
  );
  await context.test(
    "JWT отвергает подмену, истечение и другой алгоритм; длина пароля считается в байтах",
    async () => {
      const token = cookie.slice(cookie.indexOf("=") + 1);
      const claims = jwt.decode(token);
      for (const invalid of [
        token.slice(0, -4) + "xxxx",
        jwt.sign({ jti: claims.jti }, SECRET, {
          subject: user.id,
          issuer: "campus-api",
          audience: "campus-web",
          expiresIn: -1,
        }),
        jwt.sign({ jti: claims.jti }, SECRET, {
          algorithm: "HS384",
          subject: user.id,
          issuer: "campus-api",
          audience: "campus-web",
          expiresIn: 60,
        }),
      ]) {
        assert.equal(
          (await request("/auth/me", { cookie: `campus_session=${invalid}` }))
            .status,
          401,
        );
      }
      assert.equal(
        (
          await request("/auth/register", {
            body: { ...registration, password: "я".repeat(40) },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/auth/login", {
            body: {
              email: registration.email,
              password: "wrong-test-password",
            },
          })
        ).status,
        401,
      );
    },
  );
  await context.test(
    "расписание, неделя, сроки и чат берут группу профиля, игнорируя подмену в запросе",
    async () => {
      const schedule = await (
        await request("/schedule?groupCode=261-321&date=2026-10-19", { cookie })
      ).json();
      assert.equal(schedule.groupCode, "261-322");
      assert.equal(schedule.lessons[0].subject, "Сети");
      await postgres.exec(
        `INSERT INTO deadlines(title,group_id,due_at) VALUES ('Сдать сети', (SELECT id FROM study_groups WHERE code='261-322'), '2026-10-20T12:00:00Z'), ('Вне недели',NULL,'2026-11-20T12:00:00Z');`,
      );
      const week = await (
        await request("/schedule/week?groupCode=261-321&startDate=2026-10-19", {
          cookie,
        })
      ).json();
      assert.equal(week.days.length, 7);
      assert.equal(week.days[0].lessons[0].subject, "Сети");
      assert.deepEqual(
        week.deadlines.map((item) => item.title),
        ["Сдать сети"],
      );
      const chat = await (
        await request("/chat", {
          cookie,
          body: {
            messages: [
              { role: "user", content: "Расписание на неделю с 2026-10-19" },
            ],
            context: { groupCode: "261-321" },
          },
        })
      ).json();
      assert.match(chat.answer, /Неделя группы 261-322/);
      assert.match(chat.answer, /Сети/);
      assert.doesNotMatch(chat.answer, /Алгебра/);
      assert.equal(
        (await request("/schedule/week?startDate=2026-02-30")).status,
        400,
      );
      assert.equal(
        (await request("/schedule/week?startDate=9999-12-31")).status,
        400,
      );
      const dashboard = await (
        await request("/dashboard?groupCode=261-321", { cookie })
      ).json();
      assert.equal(dashboard.groupCode, "261-322");
    },
  );
  await context.test(
    "смена группы защищена от CSRF и сразу отражается в существующей сессии",
    async () => {
      assert.equal(
        (
          await request("/auth/profile", {
            cookie,
            method: "PATCH",
            body: { groupCode: "261-321" },
            header: false,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request("/auth/profile", {
            method: "PATCH",
            body: { groupCode: "261-321" },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/auth/profile", {
            cookie,
            method: "PATCH",
            body: { groupCode: "999-999" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/auth/profile", {
            cookie,
            method: "PATCH",
            body: { groupCode: "261-321" },
          })
        ).status,
        200,
      );
      const profile = await (await request("/auth/me", { cookie })).json();
      assert.equal(profile.user.groupCode, "261-321");
      // Снимок может заменяться независимо: профиль связан с public.study_groups.
      await postgres.exec(
        "DELETE FROM navigator.fact_lessons; DELETE FROM navigator.dim_groups;",
      );
      assert.equal(
        (await (await request("/auth/me", { cookie })).json()).user.id,
        user.id,
      );
    },
  );
  await context.test(
    "выход отзывает сессию, повторное использование JWT запрещено; вход работает",
    async () => {
      assert.equal(
        (await request("/auth/logout", { cookie, body: {} })).status,
        200,
      );
      assert.equal((await request("/auth/me", { cookie })).status, 401);
      const login = await request("/auth/login", {
        body: { email: registration.email, password: registration.password },
      });
      assert.equal(login.status, 200);
      assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    },
  );
});

test("cookie в production защищена Secure, SameSite=None задаётся явно", () => {
  assert.equal(
    sessionCookieOptions({ environment: "production" }).secure,
    true,
  );
  assert.equal(
    sessionCookieOptions({ environment: "production" }).sameSite,
    "lax",
  );
  assert.equal(
    sessionCookieOptions({
      auth: { cookieSecure: true, cookieSameSite: "none" },
    }).sameSite,
    "none",
  );
});

test("попытки входа ограничены, сторонний Origin не проходит CORS", async (context) => {
  const authService = {
    isConfigured: true,
    login: async () => {
      throw Object.assign(new Error("Неверный email или пароль."), {
        status: 401,
      });
    },
  };
  const server = await new Promise((resolve) => {
    const listener = createApp({
      authService,
      campusRepository: {},
      assistantService: {},
      config: { clientOrigins: [ORIGIN] },
    }).listen(0, "127.0.0.1", () => resolve(listener));
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;
  const options = {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      "Content-Type": "application/json",
      "X-Campus-Request": "1",
    },
    body: "{}",
  };
  for (let attempt = 0; attempt < 10; attempt++)
    assert.equal((await fetch(url, options)).status, 401);
  assert.equal((await fetch(url, options)).status, 429);
  assert.equal(
    (
      await fetch(url, {
        ...options,
        headers: { ...options.headers, Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
});
