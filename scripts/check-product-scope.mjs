import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required product-scope file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected product-scope text: ${snippet}`);
    }
  }
}

console.log("Product scope report");

requireSnippets("docs/PRODUCT_SCOPE.md", [
  "# Product Scope Contract",
  "## Product Promise",
  "## Current Supported Scope",
  "## Explicitly Out Of Scope",
  "## Foundation-First Rule",
  "## Feature Intake",
  "## Change Rules",
  "## Verification",
  "Avoid adding features only to make the project look larger.",
  "Foundation-only changes are valid when they make the product easier to evolve without expanding the supported learner surface.",
  "Product proposals should use the product proposal issue template before implementation.",
  "Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Keep review/intake docs aligned when feature intake changes.",
  "Run `npm run product:check` after scope, roadmap, feature-intake, or product-positioning changes.",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.",
]);

requireSnippets("package.json", [
  '"product:check": "node scripts/check-product-scope.mjs"',
  "npm run docs:check && npm run adr:check && npm run product:check && npm run product:learning && npm run review:check && npm run dependencies:check && npm run legal:check && npm run data:check",
]);

requireSnippets("README.md", [
  "Product scope: [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)",
  "Run the product-scope contract check:",
  "npm run product:check",
  "## Current Scope",
  "- Two practice modes",
  "- Two starter sight-reading clefs",
  "- Ten starter reading notes across treble and bass",
  "- Seven natural pitch-training notes",
  "- Local JSON data import/export",
  "- Browser-level accessibility and smoke tests",
  "- CI quality gate",
  "- GitHub Pages deployment",
  "- No backend",
  "- No login",
  "- No sharps or flats",
  "This keeps the practice loop fast and finishable while leaving room for meaningful future features.",
]);

requireSnippets("CONTRIBUTING.md", [
  "NoteSense is intentionally small, but changes should still meet a production-quality bar.",
  "Keep [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) aligned when changing supported product scope, explicit non-goals, roadmap language, or feature-intake expectations; run `npm run product:check` after product-scope changes.",
  "Prefer small, shippable changes with clear user value or clear maintainability value.",
  "Do not add network services, auth, or cloud storage without preserving the current local-first practice loop.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Product-scope impact was considered for current scope, explicit non-goals, feature intake, and foundation-first expectations.",
]);

requireSnippets("docs/QUALITY.md", [
  "Avoid adding features just to make the project larger.",
  "Product-scope docs and `npm run product:check` stay aligned when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "For product-scope feedback:",
  "npm run product:check",
]);

requireSnippets("docs/RELEASE.md", [
  "Keep learner-facing behavior intentional and documented.",
  "Treat product-scope results as release evidence when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "Whether `npm run product:check` still proves README scope, explicit non-goals, contributor guidance, review guidance, and foundation-first expectations are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "The product goal is to keep the practice loop fast and polished while preserving clean seams for future sign-in, cloud storage, sync, and managed web services.",
  "`docs/PRODUCT_SCOPE.md` documents the supported learner surface, explicit non-goals, foundation-first rule, and feature-intake expectations.",
  "`scripts/check-product-scope.mjs` owns product-scope drift checks for README scope, explicit non-goals, contributor guidance, review guidance, and release docs.",
  "Product-scope changes should keep README current scope, explicit non-goals, feature-intake expectations, foundation-first guidance, release guidance, and ADRs aligned.",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "NoteSense should stay local-first until account and sync work has a clear product reason.",
  "- No backend is deployed.",
  "The browser app must never connect directly to PostgreSQL or any other database.",
]);

requireSnippets("docs/THREAT_MODEL.md", [
  "NoteSense is currently a static, local-first app.",
  "## Current Scope",
  "- No backend API.",
]);

requireSnippets("docs/DATA_CONTRACT.md", [
  "NoteSense is local-first today.",
  "Future account, sync, analytics, API, or hosted-storage work must update this contract",
]);

requireSnippets("docs/PRIVACY.md", [
  "No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.",
  "Future sign-in, cloud sync, backend APIs, or hosted storage must be designed as explicit privacy-impacting changes.",
]);

requireSnippets("docs/ACCESSIBILITY.md", [
  "Accessibility is part of the feature definition, not a final cleanup step.",
]);

requireSnippets("docs/TESTING.md", [
  "NoteSense keeps a small product surface, but the testing system should still make quality ownership explicit.",
]);

requireSnippets("docs/OPERATIONS.md", ["NoteSense is currently a static, local-first app deployed to GitHub Pages."]);

requireSnippets("docs/adr/README.md", [
  "Add an ADR when a change affects data ownership, deployment, quality gates, runtime policy, security posture, release process, service boundaries, or future backend direction.",
]);

console.log("- product scope documentation checked");
console.log("- README scope and explicit non-goals checked");
console.log("- contributor, review, architecture, release, data, privacy, and backend boundary docs checked");

if (failures.length > 0) {
  console.error("\nProduct scope check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Product scope check passed.");
