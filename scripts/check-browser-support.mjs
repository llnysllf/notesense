import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required browser-support file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected browser-support text: ${snippet}`);
    }
  }
}

console.log("Browser support report");

requireSnippets("docs/BROWSER_SUPPORT.md", [
  "# Browser Support Contract",
  "## Supported Surface",
  "## Runtime Assumptions",
  "## Unsupported Surface",
  "## Verification Evidence",
  "## Change Rules",
  "## Verification",
  "Evergreen desktop Chromium, Firefox, and WebKit/Safari-engine browsers are covered by the main Playwright workflow.",
  "Mobile Chromium viewport behavior is covered by the main Playwright workflow.",
  "Performance expectations live in [PERFORMANCE.md](PERFORMANCE.md).",
  "Run `npm run browsers:check` after browser-support, Playwright project, Pages smoke, visual-regression, PWA, runtime-surface, Lighthouse, or browser-support documentation changes.",
  "Run `npm run performance:check` when browser changes affect bundle budgets, Lighthouse, metadata, PWA, runtime-surface, or Pages smoke evidence.",
]);

requireSnippets("package.json", [
  '"browsers:check": "node scripts/check-browser-support.mjs"',
  "npm run accessibility:check && npm run testing:check && npm run browsers:check && npm run performance:check && npm run operations:check && npm run release:notes",
  '"test:e2e": "playwright test"',
  '"test:e2e:pages": "playwright test --config=playwright.pages.config.ts"',
  '"test:e2e:visual": "playwright test --config=playwright.visual.config.ts"',
  '"pwa:check": "node scripts/check-pwa-artifacts.mjs"',
  '"runtime:check": "node scripts/check-runtime-surface.mjs"',
]);

requireSnippets("playwright.config.ts", [
  'baseURL: "http://127.0.0.1:4173"',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  'command: "npm run build && npm run preview -- --host 127.0.0.1"',
  'name: "chromium"',
  'name: "firefox"',
  'name: "webkit"',
  'name: "mobile-chromium"',
]);

requireSnippets("playwright.pages.config.ts", [
  'testMatch: "**/pages-smoke.spec.ts"',
  'baseURL: "http://127.0.0.1:4174"',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  "npm run build:pages && node scripts/serve-pages-preview.mjs --port 4174",
  'url: "http://127.0.0.1:4174/notesense/"',
  'name: "pages-chromium"',
  'name: "pages-mobile-chromium"',
]);

requireSnippets("playwright.visual.config.ts", [
  'testMatch: "**/visual.spec.ts"',
  "toHaveScreenshot",
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  'name: "visual-desktop-light"',
  'name: "visual-desktop-dark"',
  'name: "visual-mobile-light"',
  'name: "visual-mobile-dark"',
]);

requireSnippets("e2e/app.spec.ts", [
  'test("loads with no automated accessibility violations"',
  'test("runs the note-reading practice loop"',
  'test("answers with keyboard shortcuts in both practice modes"',
  'test("exports local practice data"',
  'test("imports local practice data"',
  'test("surfaces storage failures without crashing"',
  'test("runs the pitch-training practice loop"',
  'test("keeps the responsive layout inside the viewport"',
]);

requireSnippets("e2e/pages-smoke.spec.ts", [
  'test("serves the GitHub Pages build under the /notesense/ base path"',
  'await page.goto("/notesense/")',
  'getByRole("button", { name: "Start drill" })',
]);

requireSnippets("e2e/visual.spec.ts", [
  'test("matches the note-reading shell"',
  'test("matches the pitch-training shell"',
  'toHaveScreenshot("note-reading-shell.png"',
  'toHaveScreenshot("pitch-training-shell.png"',
]);

requireSnippets("README.md", [
  "Browser support: [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md)",
  "Run the browser-support contract check:",
  "npm run browsers:check",
  "`npm run browsers:check` verifies Playwright browser projects, Pages/mobile support, visual-regression profiles, PWA/runtime boundaries, and browser-support docs stay aligned.",
]);

requireSnippets("CONTRIBUTING.md", [
  "For browser-support, Playwright project, Pages smoke, visual-regression, PWA, runtime-surface, Lighthouse, or browser-support documentation changes, keep [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md) aligned and run the browser-support contract check:",
  "npm run browsers:check",
  "Keep [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md) aligned when changing supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, or browser verification evidence; run `npm run browsers:check` after browser-support changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Browser-support impact was considered for supported engines, mobile viewports, Pages base path, Web Audio, LocalStorage, PWA/offline behavior, and browser verification evidence.",
]);

requireSnippets("docs/ACCESSIBILITY.md", [
  "Browser support expectations live in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md).",
  "Run `npm run browsers:check` after changing supported browsers, device profiles, responsive support, or browser verification evidence.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run browsers:check",
  "browser-support governance stays part of the foundation contract gate",
]);

requireSnippets("docs/QUALITY.md", [
  "Browser-support docs and `npm run browsers:check` stay aligned when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.",
  "For browser-support feedback:",
  "npm run browsers:check",
  "`docs/BROWSER_SUPPORT.md` defines supported engines, device shapes, runtime assumptions, unsupported surfaces, and browser verification evidence.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat browser-support results as release evidence when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.",
  "Whether `npm run browsers:check` still proves supported engines, mobile viewports, Pages base path, visual-regression profiles, PWA/runtime boundaries, and browser-support docs are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/BROWSER_SUPPORT.md` documents supported engines, device shapes, runtime assumptions, unsupported surfaces, and browser verification evidence.",
  "`scripts/check-browser-support.mjs` owns browser-support drift checks for Playwright browser projects, Pages/mobile support, visual-regression profiles, PWA/runtime boundaries, and browser-support docs.",
  "Browser-support changes should keep supported engines, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, PWA/offline behavior, accessibility guidance, testing guidance, release guidance, and PR review guidance aligned.",
]);

requireSnippets("docs/OPERATIONS.md", [
  "The supported production surface is the `main` branch deployed to GitHub Pages at `https://llnysllf.github.io/notesense/`.",
  "browser-specific",
]);

requireSnippets("docs/PRIVACY.md", [
  "No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.",
  "Practice progress, note stats, pitch stats, and session history are saved in LocalStorage under `notesense.progress.v2`.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0040: Add Browser Support Contract"]);

requireSnippets("CHANGELOG.md", [
  "Browser-support contract with `docs/BROWSER_SUPPORT.md` and `npm run browsers:check` for supported engines, mobile viewports, Pages base path, visual-regression profiles, PWA/runtime boundaries, and browser verification evidence",
]);

console.log("- Playwright browser projects checked");
console.log("- Pages, mobile, and visual support checked");
console.log("- browser-support docs and governance links checked");

if (failures.length > 0) {
  console.error("\nBrowser support check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Browser support check passed.");
