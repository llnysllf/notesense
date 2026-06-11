import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/error-boundary.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4175",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build -- --mode resilience && npm run preview -- --host 127.0.0.1 --port 4175 --strictPort",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4175",
  },
  projects: [
    {
      name: "resilience-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "resilience-mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
