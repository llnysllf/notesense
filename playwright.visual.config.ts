import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/visual.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Tight enough that accent-scale changes (active pills, buttons,
      // ribbons) fail the full-page shells: a 0.01 ratio once let a full
      // brand re-theme pass because changed accents covered <1% of pixels.
      maxDiffPixelRatio: 0.002,
      threshold: 0.12,
    },
  },
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4176",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4176 --strictPort",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4176",
  },
  projects: [
    {
      name: "visual-desktop-light",
      use: { ...devices["Desktop Chrome"], colorScheme: "light" },
    },
    {
      name: "visual-desktop-dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
    },
    {
      name: "visual-mobile-light",
      use: { ...devices["Pixel 5"], colorScheme: "light" },
    },
    {
      name: "visual-mobile-dark",
      use: { ...devices["Pixel 5"], colorScheme: "dark" },
    },
  ],
});
