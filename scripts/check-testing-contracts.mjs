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
  "npm run review:check",
  "npm run dependencies:check",
  "npm run legal:check",
  "npm run security:privacy",
  "npm run browsers:check",
  "npm run performance:check",
  "npm run operations:check",
  "npm run observability:check",
  "npm run release:safety",
  "Browser tests run against production preview builds",
  "UI behavior tests block service workers",
  "Coverage thresholds are per-file",
  "review/intake governance stays part of the foundation contract gate",
  "dependency-maintenance governance stays part of the foundation contract gate",
  "legal/licensing governance stays part of the foundation contract gate",
  "security/privacy governance stays part of the foundation contract gate",
  "browser-support governance stays part of the foundation contract gate",
  "performance governance stays part of the foundation contract gate",
  "operations governance stays part of the foundation contract gate",
  "observability governance stays part of the foundation contract gate",
  "release-safety governance stays part of the foundation contract gate",
  "Dedicated workflows own CodeQL, Dependency Review, Lighthouse, Visual Regression, and Pages deployment evidence.",
]);

requireSnippets("package.json", [
  '"adr:check": "node scripts/check-adr-contracts.mjs"',
  '"product:check": "node scripts/check-product-scope.mjs"',
  '"review:check": "node scripts/check-review-process.mjs"',
  '"dependencies:check": "node scripts/check-dependency-maintenance.mjs"',
  '"legal:check": "node scripts/check-legal-contract.mjs"',
  '"security:privacy": "node scripts/check-security-privacy.mjs"',
  '"testing:check": "node scripts/check-testing-contracts.mjs"',
  '"browsers:check": "node scripts/check-browser-support.mjs"',
  '"performance:check": "node scripts/check-performance-contract.mjs"',
  '"operations:check": "node scripts/check-operations-contract.mjs"',
  '"observability:check": "node scripts/check-observability-contract.mjs"',
  '"release:safety": "node scripts/check-release-safety-contract.mjs"',
  "npm run dependencies:check && npm run legal:check && npm run data:check && npm run security:privacy && npm run architecture:check",
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
  "Review/intake docs and `npm run review:check` stay aligned when CODEOWNERS, issue templates, PR templates, labels, triage routing, or review evidence expectations change.",
  "Dependency-maintenance docs and `npm run dependencies:check` stay aligned when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy changes.",
  "Legal/licensing docs and `npm run legal:check` stay aligned when root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, dependency license policy, release guidance, or PR review guidance changes.",
  "Security/privacy docs and `npm run security:privacy` stay aligned when local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, telemetry, analytics, or security posture changes.",
  "Testing contract docs and `npm run testing:check` stay aligned when package scripts, coverage thresholds, browser configs, CI quality gates, or test ownership changes.",
  "Browser-support docs and `npm run browsers:check` stay aligned when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.",
  "Performance docs and `npm run performance:check` stay aligned when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.",
  "For testing-contract feedback:",
  "npm run testing:check",
  "`npm run testing:check` verifies that package scripts, coverage thresholds, browser configs, workflow specs, and CI evidence stay aligned.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat ADR governance results as release evidence when architecture decisions are added, renamed, removed, or moved between statuses.",
  "Treat product-scope results as release evidence when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "Treat review/intake results as release evidence when CODEOWNERS, issue templates, PR templates, labels, triage routing, or review evidence expectations change.",
  "Treat dependency-maintenance results as release evidence when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy changes.",
  "Treat legal/licensing results as release evidence when root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, dependency license policy, release guidance, or PR review guidance changes.",
  "Treat security/privacy results as release evidence when local-first privacy, import/export trust, runtime APIs, CSP, PWA behavior, future auth/sync, backend readiness, telemetry, analytics, or security posture changes.",
  "Treat testing-contract results as release evidence when test ownership, package scripts, coverage thresholds, browser configs, CI quality gates, or workflow evidence changes.",
  "Treat browser-support results as release evidence when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.",
  "Treat performance-contract results as release evidence when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.",
  "Treat observability results as release evidence when production visibility, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA metrics, support expectations, or production signal ownership changes.",
  "Treat release-safety results as release evidence when deployment, staging, canary, progressive rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, or release sign-off expectations change.",
  "Whether `npm run testing:check` still proves package scripts, coverage thresholds, Playwright configs, browser specs, and CI evidence are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`scripts/check-adr-contracts.mjs` owns ADR numbering, status, required-section, and index-link checks.",
  "`scripts/check-product-scope.mjs` owns product-scope drift checks for README scope, explicit non-goals, contributor guidance, review guidance, and release docs.",
  "`scripts/check-review-process.mjs` owns review/intake drift checks for CODEOWNERS, issue templates, PR template, security routing, and review evidence.",
  "`scripts/check-dependency-maintenance.mjs` owns dependency-maintenance drift checks for Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, and workflow-update expectations.",
  "`scripts/check-legal-contract.mjs` owns legal/licensing drift checks for the root license, package metadata, legal docs, dependency-license boundaries, release guidance, and PR review guidance.",
  "`scripts/check-security-privacy.mjs` owns security/privacy drift checks for privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface, CSP, PWA, supply-chain, and review/release guidance.",
  "`scripts/check-browser-support.mjs` owns browser-support drift checks for Playwright browser projects, Pages/mobile support, visual-regression profiles, PWA/runtime boundaries, and browser-support docs.",
  "`scripts/check-performance-contract.mjs` owns performance-contract drift checks for bundle budgets, Lighthouse thresholds, metadata/PWA/runtime checks, Pages smoke coverage, and performance-review guidance.",
  "`scripts/check-observability-contract.mjs` owns observability drift checks for production visibility, future telemetry rules, incident review templates, SLO/SLA boundaries, release guidance, and PR review guidance.",
  "`scripts/check-release-safety-contract.mjs` owns release-safety drift checks for deployment boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, release guidance, and PR review guidance.",
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
