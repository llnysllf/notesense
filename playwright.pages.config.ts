import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/pages-smoke.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build:pages && node scripts/serve-pages-preview.mjs --port 4174",
    // Pages checks must serve this checkout's Pages-shaped build, not an
    // unrelated local preview that happens to use the conventional port.
    reuseExistingServer: false,
    url: "http://127.0.0.1:4174/notesense/",
  },
  projects: [
    {
      name: "pages-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "pages-mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
