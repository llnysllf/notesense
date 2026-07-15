import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

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
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected testing text: ${snippet}`);
    }
  }
}

function requirePlaywrightServerContract(file, { commandSnippet, port, strictPort }) {
  const content = readProjectFile(file);
  const url = `http://127.0.0.1:${port}`;

  for (const snippet of [`baseURL: "${url}"`, `url: "${url}`, commandSnippet]) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected Playwright server contract text: ${snippet}`);
    }
  }

  if (strictPort && !content.includes("--strictPort")) {
    failures.push(`${file} must use --strictPort so preview server port drift fails fast`);
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
  "npm run product:learning",
  "npm run review:check",
  "npm run dependencies:check",
  "npm run legal:check",
  "npm run i18n:check",
  "npm run security:privacy",
  "npm run browsers:check",
  "npm run performance:check",
  "npm run operations:check",
  "npm run observability:check",
  "npm run release:safety",
  "Browser tests run against production preview builds",
  "UI behavior tests block service workers",
  "Coverage thresholds are per-file",
  "App-shell coordination",
  "local observability helper",
  "hook orchestration modules",
  "shared contract-check helper behavior",
  "product-learning governance stays part of the foundation contract gate",
  "review/intake governance stays part of the foundation contract gate",
  "dependency-maintenance governance stays part of the foundation contract gate",
  "legal/licensing and conduct governance stays part of the foundation contract gate",
  "i18n/l10n governance stays part of the foundation contract gate",
  "security/privacy governance stays part of the foundation contract gate",
  "browser-support governance stays part of the foundation contract gate",
  "performance governance stays part of the foundation contract gate",
  "operations governance stays part of the foundation contract gate",
  "observability governance stays part of the foundation contract gate",
  "release-safety governance stays part of the foundation contract gate",
]);

requireSnippets("package.json", [
  '"adr:check": "node scripts/check-adr-contracts.mjs"',
  '"product:check": "node scripts/check-product-scope.mjs"',
  '"product:learning": "node scripts/check-product-learning-contract.mjs"',
  '"review:check": "node scripts/check-review-process.mjs"',
  '"dependencies:check": "node scripts/check-dependency-maintenance.mjs"',
  '"legal:check": "node scripts/check-legal-contract.mjs"',
  '"i18n:check": "node scripts/check-i18n-contract.mjs"',
  '"security:privacy": "node scripts/check-security-privacy.mjs"',
  '"testing:check": "node scripts/check-testing-contracts.mjs"',
  '"browsers:check": "node scripts/check-browser-support.mjs"',
  '"performance:check": "node scripts/check-performance-contract.mjs"',
  '"operations:check": "node scripts/check-operations-contract.mjs"',
  '"observability:check": "node scripts/check-observability-contract.mjs"',
  '"release:safety": "node scripts/check-release-safety-contract.mjs"',
  "npm run product:check && npm run product:learning && npm run review:check && npm run dependencies:check",
  "npm run dependencies:check && npm run legal:check && npm run data:check && npm run i18n:check && npm run security:privacy && npm run architecture:check",
  "npm run accessibility:check && npm run testing:check && npm run browsers:check && npm run performance:check && npm run operations:check && npm run observability:check && npm run release:safety && npm run release:notes",
  '"test": "vitest run"',
  '"test:coverage": "vitest run --coverage"',
  '"test:e2e": "playwright test"',
  '"test:e2e:resilience": "playwright test --config=playwright.resilience.config.ts"',
  '"test:e2e:pages": "playwright test --config=playwright.pages.config.ts"',
  '"test:e2e:visual": "playwright test --config=playwright.visual.config.ts"',
  '"verify": "npm run security:supply-chain && npm run check && npm run test:e2e:resilience && npm run build:pages && npm run security:policy && npm run metadata:check && npm run pwa:check && npm run runtime:check && npm run perf:budget && npm run test:e2e:pages"',
]);

requireSnippets("vite.config.ts", [
  '"src/**/*.test.ts"',
  '"src/**/*.test.tsx"',
  '"shared/**/*.test.ts"',
  '"scripts/**/*.test.mjs"',
  '"src/App.tsx"',
  '"src/observability.ts"',
  '"src/practiceEngine.ts"',
  '"src/storage.ts"',
  '"src/hooks/useSettings.ts"',
  '"src/hooks/usePracticeProgress.ts"',
  '"src/hooks/useDataPortability.ts"',
  '"src/hooks/usePracticeSession.ts"',
  '"shared/src/practiceData.ts"',
  '"shared/src/merge.ts"',
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
  'command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort"',
  'name: "chromium"',
  'name: "firefox"',
  'name: "webkit"',
  'name: "mobile-chromium"',
]);

requirePlaywrightServerContract("playwright.config.ts", {
  commandSnippet: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
  port: 4173,
  strictPort: true,
});

requireSnippets("playwright.resilience.config.ts", [
  'testMatch: "**/error-boundary.spec.ts"',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  "npm run build -- --mode resilience",
  'name: "resilience-chromium"',
  'name: "resilience-mobile-chromium"',
]);

requirePlaywrightServerContract("playwright.resilience.config.ts", {
  commandSnippet: "npm run preview -- --host 127.0.0.1 --port 4175 --strictPort",
  port: 4175,
  strictPort: true,
});

requireSnippets("playwright.pages.config.ts", [
  'testMatch: "**/pages-smoke.spec.ts"',
  'serviceWorkers: "block"',
  'trace: "retain-on-failure"',
  "npm run build:pages && node scripts/serve-pages-preview.mjs",
  'url: "http://127.0.0.1:4174/notesense/"',
  'name: "pages-chromium"',
  'name: "pages-mobile-chromium"',
]);

requirePlaywrightServerContract("playwright.pages.config.ts", {
  commandSnippet: "node scripts/serve-pages-preview.mjs --port 4174",
  port: 4174,
  strictPort: false,
});

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

requirePlaywrightServerContract("playwright.visual.config.ts", {
  commandSnippet: "npm run preview -- --host 127.0.0.1 --port 4176 --strictPort",
  port: 4176,
  strictPort: true,
});

requireSnippets("e2e/app.spec.ts", [
  'page.on("pageerror"',
  'message.type() === "error"',
  'test("loads with no automated accessibility violations"',
  'test("runs the note-reading practice loop"',
  'test("answers reading shortcuts and exact pitch keys"',
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

requireSnippets("docs/QUALITY.md", [
  "ADR index and `npm run adr:check` stay aligned when decision records are added, renamed, removed, or moved between statuses.",
  "Product-scope docs and `npm run product:check` stay aligned when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "Product-learning docs and `npm run product:learning` stay aligned when feedback loops, future analytics, experiments, feature flags, support signals, product metrics, delivery metrics, DORA expectations, or roadmap validation changes.",
  "Review/intake docs and `npm run review:check` stay aligned when CODEOWNERS, issue templates, PR templates, labels, triage routing, or review evidence expectations change.",
  "Dependency-maintenance docs and `npm run dependencies:check` stay aligned when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, SBOM policy, or workflow-update policy changes.",
  "Legal/licensing docs and `npm run legal:check` stay aligned when root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, code-of-conduct expectations, dependency license policy, release guidance, or PR review guidance changes.",
  "Security/privacy docs and `npm run security:privacy` stay aligned when local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, telemetry, analytics, or security posture changes.",
  "Testing contract docs and `npm run testing:check` stay aligned when package scripts, coverage thresholds, browser configs, CI quality gates, or test ownership changes.",
  "App-shell coordination for settings, rounds, import/export, reset, and mode switching meets the configured Vitest coverage thresholds.",
  "React hook orchestration for settings, progress, data portability, and practice sessions meets the configured Vitest coverage thresholds.",
  "Browser-support docs and `npm run browsers:check` stay aligned when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.",
  "Performance docs and `npm run performance:check` stay aligned when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.",
  "For testing-contract feedback:",
  "npm run testing:check",
  "`npm run testing:check` verifies that package scripts, coverage thresholds, browser configs, workflow specs, and CI evidence stay aligned.",
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run testing:check` still proves package scripts, coverage thresholds, Playwright configs, browser specs, and CI evidence are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`scripts/check-adr-contracts.mjs` owns ADR numbering, status, required-section, and index-link checks.",
  "`scripts/check-browser-support.mjs` owns browser-support drift checks for Playwright browser projects, Pages/mobile support, visual-regression profiles, PWA/runtime boundaries, and browser-support docs.",
]);

console.log("- testing documentation checked");
console.log("- package scripts, coverage thresholds, and Playwright configs checked");
console.log("- Playwright preview server contracts checked");
console.log("- browser specs, CI workflow, and governance docs checked");

if (failures.length > 0) {
  console.error("\nTesting contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Testing contract check passed.");
