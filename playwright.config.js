import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:32201", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: [
    {
      command: "node server/test-support/startPreview.js",
      url: "http://127.0.0.1:32200/api/health",
      timeout: 60_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 32201 --strictPort",
      url: "http://127.0.0.1:32201",
      env: { VITE_API_URL: "http://127.0.0.1:32200" },
    },
  ],
});
