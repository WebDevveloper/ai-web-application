import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

async function startTestServer() {
  const campusRepository = {
    ping: async () => false,
    getDashboard: async () => ({ lessons: [], deadlines: [], locations: [] }),
    saveFeedback: async () => {},
  };
  const assistantService = {
    answer: async () => ({ answer: "test" }),
  };
  const app = createApp({
    assistantService,
    campusRepository,
    config: {
      clientOrigins: ["http://localhost:5173"],
      defaultGroupCode: "261-321",
    },
  });
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () => {
      resolve(listeningServer);
    });
  });
  const address = server.address();

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

test("API returns JSON for health, invalid payloads and unknown routes", async (context) => {
  const { server, baseUrl } = await startTestServer();
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 503);
  assert.deepEqual(await healthResponse.json(), {
    status: "degraded",
    database: "not_configured",
  });

  const invalidJsonResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(invalidJsonResponse.status, 400);
  assert.deepEqual(await invalidJsonResponse.json(), {
    error: "Некорректный JSON в запросе.",
  });

  const missingRouteResponse = await fetch(`${baseUrl}/api/missing`);
  assert.equal(missingRouteResponse.status, 404);
  assert.deepEqual(await missingRouteResponse.json(), {
    error: "API-маршрут не найден.",
  });
});
