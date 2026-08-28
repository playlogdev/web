import { defineConfig, devices } from "@playwright/test";

const webURL = "http://127.0.0.1:3001";
const fixtureURL = "http://127.0.0.1:8092";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: webURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "tablet-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 } },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/fixtures/mock-api.mjs",
      url: `${fixtureURL}/health`,
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3001",
      url: webURL,
      env: { API_BASE_URL: fixtureURL },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
