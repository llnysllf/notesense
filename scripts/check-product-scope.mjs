import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

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
    if (!includesContractSnippet(content, snippet)) {
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
  "Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Run `npm run product:check` after scope, roadmap, feature-intake, or product-positioning changes.",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.",
]);

requireSnippets("package.json", [
  '"product:check": "node scripts/check-product-scope.mjs"',
  "npm run docs:check && npm run adr:check && npm run product:check && npm run product:learning && npm run review:check && npm run dependencies:check && npm run legal:check && npm run data:check",
]);

requireSnippets("CONTRIBUTING.md", [
  "Keep [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) aligned when changing supported product scope, explicit non-goals, roadmap language, or feature-intake expectations; run `npm run product:check` after product-scope changes.",
  "Prefer small, shippable changes with clear user value or clear maintainability value.",
]);

requireSnippets("docs/QUALITY.md", [
  "Product-scope docs and `npm run product:check` stay aligned when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.",
  "For product-scope feedback:",
  "npm run product:check",
]);

requireSnippets("docs/RELEASE.md", [
  "Keep learner-facing behavior intentional and documented.",
  "Whether `npm run product:check` still proves README scope, explicit non-goals, contributor guidance, review guidance, and foundation-first expectations are aligned.",
]);

requireSnippets("docs/BACKEND_READINESS.md", ["- No backend is deployed."]);

requireSnippets("docs/THREAT_MODEL.md", [
  "NoteSense is currently a static, local-first app.",
  "## Current Scope",
  "- No backend API.",
]);

requireSnippets("docs/DATA_CONTRACT.md", ["NoteSense is local-first today."]);

requireSnippets("docs/PRIVACY.md", [
  "No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.",
]);

requireSnippets("docs/ACCESSIBILITY.md", [
  "Accessibility is part of the feature definition, not a final cleanup step.",
]);

requireSnippets("docs/OPERATIONS.md", ["NoteSense is currently a static, local-first app deployed to GitHub Pages."]);

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
