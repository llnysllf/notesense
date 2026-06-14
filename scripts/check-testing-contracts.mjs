import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required testing file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected testing text: ${snippet}`);
    }
  }
}

console.log("Testing contract report");

requireSnippets("docs/TESTING.md", [
  "# Testing Contract",
  "## Test Ownership Matrix",
  "## Change Routing",
  "## Determinism Rules",
  "## Coverage Rules",
  "## CI Contract",
  "## Review Rules",
  "## Verification",
  "npm run testing:check",
  "npm run verify",
  "npm run adr:check",
  "npm run product:check",
  "Browser tests run against production preview builds",
  "UI behavior tests block service workers",
  "Coverage thresholds are per-file",
  "Dedicated workflows own CodeQL, Dependency Review, Lighthouse, Visual Regression, and Pages deployment evidence.",
]);

requireSnippets("package.json", [
  '"adr:check": "node scripts/check-adr-contracts.mjs"',
  '"product:check": "node scripts/check-product-scope.mjs"',
  '"testing:check": "node scripts/check-testing-contracts.mjs"',
  "npm run docs:check && npm run adr:check && npm run product:check && npm run data:check",
  "npm run accessibility:check && npm run testing:check && npm run release:notes",
  '"test": "vitest run"',
  '"test:coverage": "vitest run --coverage"',
  '"test:e2e": "playwright test"',
  '"test:e2e:resilience": "playwright test --config=playwright.resilience.config.ts"',
  '"test:e2e:pages": "playwright test --config=playwright.pages.config.ts"',
  '"test:e2e:visual": "playwright test --config=playwright.visual.config.ts"',
  '"verify": "npm run security:supply-chain && npm run check && npm run test:e2e:resilience && npm run build:pages && npm run security:policy && npm run metadata:check && npm run pwa:check && npm run runtime:check && npm run perf:budget && npm run test:e2e:pages"',
]);

requireSnippets("vite.config.ts", [
  'include: ["src/**/*.test.ts", "src/**/*.test.tsx", "shared/**/*.test.ts"]',
  'include: ["src/practiceEngine.ts", "src/storage.ts", "shared/src/practiceData.ts", "shared/src/merge.ts"]',
  "perFile: true",
  "statements: 85",
  "branches: 80",
  "functions: 90",
  "lines: 85",
]);

requireSnippets("playwright.config.ts", [
  'testIgnore: ["**/error-boundary.spec.ts", "**/pages-smoke.spec.ts", "**/visual.spec.ts"]',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  'command: "npm run build && npm run preview -- --host 127.0.0.1"',
  'name: "chromium"',
  'name: "firefox"',
  'name: "webkit"',
  'name: "mobile-chromium"',
]);

requireSnippets("playwright.resilience.config.ts", [
  'testMatch: "**/error-boundary.spec.ts"',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  "npm run build -- --mode resilience",
  'name: "resilience-chromium"',
  'name: "resilience-mobile-chromium"',
]);

requireSnippets("playwright.pages.config.ts", [
  'testMatch: "**/pages-smoke.spec.ts"',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  "npm run build:pages && node scripts/serve-pages-preview.mjs",
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
  'page.on("pageerror"',
  'message.type() === "error"',
  'test("loads with no automated accessibility violations"',
  'test("runs the note-reading practice loop"',
  'test("answers with keyboard shortcuts in both practice modes"',
  'test("exports local practice data"',
  'test("imports local practice data"',
  'test("rejects invalid imported practice data"',
  'test("surfaces storage failures without crashing"',
  'test("keeps the responsive layout inside the viewport"',
]);

requireSnippets("e2e/error-boundary.spec.ts", [
  'test("shows an accessible recovery screen when rendering fails"',
  'window.sessionStorage.setItem("notesense.forceRenderError", "true")',
  'getByRole("alert")',
]);

requireSnippets("e2e/pages-smoke.spec.ts", [
  'test("serves the GitHub Pages build under the /notesense/ base path"',
  'page.on("requestfailed"',
  'page.on("pageerror"',
  'meta[http-equiv="Content-Security-Policy"]',
  'await page.goto("/notesense/")',
  'getByRole("button", { name: "Start drill" })',
]);

requireSnippets("e2e/visual.spec.ts", [
  "window.localStorage.clear()",
  "Math.random = () => 0",
  'test("matches the note-reading shell"',
  'test("matches the pitch-training shell"',
  'toHaveScreenshot("note-reading-shell.png"',
  'toHaveScreenshot("pitch-training-shell.png"',
]);

requireSnippets(".github/workflows/ci.yml", [
  "name: CI",
  "name: Quality gate",
  "node-version-file: .nvmrc",
  "run: npm ci",
  "run: npx playwright install --with-deps chromium firefox webkit",
  "run: npm run verify",
  "if: failure()",
  "retention-days: 7",
]);

for (const workflow of [
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/lighthouse.yml",
  ".github/workflows/visual-regression.yml",
  ".github/workflows/deploy-pages.yml",
]) {
  requireSnippets(workflow, ["name:"]);
}

requireSnippets("README.md", [
  "Testing strategy: [docs/TESTING.md](docs/TESTING.md)",
  "Run the testing contract check:",
  "npm run testing:check",
  "`npm run testing:check` verifies that the test ownership matrix, package scripts, Vitest coverage thresholds, Playwright configs, browser specs, and CI quality gate stay aligned.",
]);

requireSnippets("docs/QUALITY.md", [
  "ADR index and `npm run adr:check` stay aligned when decision records are added, renamed, removed, or moved between statuses.",
  "Product-scope docs and `npm run product:check` stay aligned when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "Testing contract docs and `npm run testing:check` stay aligned when package scripts, coverage thresholds, browser configs, CI quality gates, or test ownership changes.",
  "For testing-contract feedback:",
  "npm run testing:check",
  "`npm run testing:check` verifies that package scripts, coverage thresholds, browser configs, workflow specs, and CI evidence stay aligned.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat ADR governance results as release evidence when architecture decisions are added, renamed, removed, or moved between statuses.",
  "Treat product-scope results as release evidence when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "Treat testing-contract results as release evidence when test ownership, package scripts, coverage thresholds, browser configs, CI quality gates, or workflow evidence changes.",
  "Whether `npm run testing:check` still proves package scripts, coverage thresholds, Playwright configs, browser specs, and CI evidence are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`scripts/check-adr-contracts.mjs` owns ADR numbering, status, required-section, and index-link checks.",
  "`scripts/check-product-scope.mjs` owns product-scope drift checks for README scope, explicit non-goals, contributor guidance, review guidance, and release docs.",
  "`docs/TESTING.md` documents test ownership, change routing, determinism, coverage, CI, and review expectations.",
  "`scripts/check-testing-contracts.mjs` owns testing-contract drift checks for package scripts, Vitest coverage thresholds, Playwright configs, browser specs, and CI workflow evidence.",
  "Testing-contract changes should keep package scripts, coverage thresholds, browser configs, CI workflow evidence, and release guidance aligned.",
]);

console.log("- testing documentation checked");
console.log("- package scripts, coverage thresholds, and Playwright configs checked");
console.log("- browser specs, CI workflow, and governance docs checked");

if (failures.length > 0) {
  console.error("\nTesting contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Testing contract check passed.");
