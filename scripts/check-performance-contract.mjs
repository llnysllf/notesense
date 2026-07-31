import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required performance file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected performance text: ${snippet}`);
    }
  }
}

console.log("Performance contract report");

requireSnippets("docs/PERFORMANCE.md", [
  "# Performance Contract",
  "## Product Standard",
  "## Bundle Budgets",
  "## Lighthouse Signal",
  "## Static Asset Boundaries",
  "## Change Rules",
  "## Verification",
  "JavaScript asset: 264 KiB raw, 85 KiB gzip",
  "CSS asset: 34 KiB raw, 7 KiB gzip",
  "total Pages output: 397 KiB raw, 124 KiB gzip",
  "The Lighthouse workflow audits the Pages-shaped app at `http://127.0.0.1:4174/notesense/` with three runs.",
  "Run `npm run performance:check` after performance-budget, Lighthouse, metadata, PWA, runtime-surface, Pages smoke, dependency, browser-support, or performance-doc changes.",
]);

requireSnippets("package.json", [
  '"performance:check": "node scripts/check-performance-contract.mjs"',
  "npm run accessibility:check && npm run testing:check && npm run browsers:check && npm run performance:check && npm run operations:check && npm run observability:check && npm run release:safety && npm run release:notes",
  '"perf:budget": "node scripts/check-bundle-budget.mjs"',
  '"metadata:check": "node scripts/check-web-metadata.mjs"',
  '"pwa:check": "node scripts/check-pwa-artifacts.mjs"',
  '"runtime:check": "node scripts/check-runtime-surface.mjs"',
  '"test:e2e:pages": "playwright test --config=playwright.pages.config.ts"',
  '"verify": "npm run security:supply-chain && npm run check && npm run test:e2e:resilience && npm run build:pages && npm run security:policy && npm run metadata:check && npm run pwa:check && npm run runtime:check && npm run perf:budget && npm run test:e2e:pages"',
]);

requireSnippets("scripts/check-bundle-budget.mjs", [
  'name: "JavaScript asset"',
  "rawBytes: 264 * KIB",
  "gzipBytes: 85 * KIB",
  'name: "CSS asset"',
  "rawBytes: 34 * KIB",
  "gzipBytes: 7 * KIB",
  'name: "HTML shell"',
  "rawBytes: 4 * KIB",
  "gzipBytes: 1 * KIB",
  'name: "web metadata asset"',
  'name: "service worker"',
  'name: "Workbox runtime"',
  "rawBytes: 397 * KIB",
  "gzipBytes: 124 * KIB",
  'console.log("Bundle budget report");',
]);

requireSnippets(".lighthouserc.json", [
  '"numberOfRuns": 3',
  '"url": ["http://127.0.0.1:4174/notesense/"]',
  '"categories:performance": ["warn", { "minScore": 0.9 }]',
  '"categories:accessibility": ["error", { "minScore": 0.95 }]',
  '"categories:best-practices": ["warn", { "minScore": 0.9 }]',
  '"categories:seo": ["warn", { "minScore": 0.9 }]',
]);

requireSnippets(".github/workflows/lighthouse.yml", [
  "name: Lighthouse",
  "name: Lighthouse audit",
  "run: npm run build:pages",
  "uses: treosh/lighthouse-ci-action@",
  "configPath: ./.lighthouserc.json",
  "uploadArtifacts: true",
  "temporaryPublicStorage: true",
  "name: lighthouse-report",
  "retention-days: 14",
]);

requireSnippets("scripts/check-web-metadata.mjs", [
  "Web metadata report",
  "HTML shell metadata passed",
  "web manifest passed",
  "Web metadata passed.",
]);

requireSnippets("scripts/check-pwa-artifacts.mjs", [
  "PWA artifact report",
  "Service worker must import the local Workbox runtime",
  "Service worker must use Workbox precaching",
  "PWA artifacts passed.",
]);

requireSnippets("scripts/check-runtime-surface.mjs", ["Runtime surface report", "Runtime surface passed."]);

requireSnippets("e2e/pages-smoke.spec.ts", [
  'test("serves the GitHub Pages build under the /notesense/ base path"',
  'await page.goto("/notesense/")',
  'getByRole("button", { name: "Start drill" })',
]);

requireSnippets("CONTRIBUTING.md", [
  "For performance-budget, Lighthouse, metadata, PWA, runtime-surface, Pages smoke, dependency, browser-support, or performance-doc changes, keep [docs/PERFORMANCE.md](docs/PERFORMANCE.md) aligned and run the performance contract check:",
  "npm run performance:check",
  "Keep [docs/PERFORMANCE.md](docs/PERFORMANCE.md) aligned when changing bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations; run `npm run performance:check` after performance-sensitive changes.",
]);

requireSnippets("docs/QUALITY.md", [
  "Performance docs and `npm run performance:check` stay aligned when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.",
  "For performance feedback:",
  "npm run performance:check",
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run performance:check` still proves bundle budgets, Lighthouse thresholds, metadata/PWA/runtime checks, Pages smoke coverage, and performance-review guidance are aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run performance:check",
  "performance governance stays part of the foundation contract gate",
]);

requireSnippets("docs/BROWSER_SUPPORT.md", [
  "Performance expectations live in [PERFORMANCE.md](PERFORMANCE.md).",
  "Run `npm run performance:check` when browser changes affect bundle budgets, Lighthouse, metadata, PWA, runtime-surface, or Pages smoke evidence.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0041: Add Performance Contract"]);

requireSnippets("CHANGELOG.md", [
  "Performance contract with `docs/PERFORMANCE.md` and `npm run performance:check` for bundle budgets, Lighthouse thresholds, metadata/PWA/runtime checks, Pages smoke coverage, and performance-review guidance",
]);

console.log("- bundle budgets and Lighthouse thresholds checked");
console.log("- metadata, PWA, runtime, and Pages smoke evidence checked");
console.log("- performance docs and governance links checked");

if (failures.length > 0) {
  console.error("\nPerformance contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Performance contract check passed.");
