import { existsSync, readFileSync } from "node:fs";
import {
  formatMarkdownHeadingExpectation,
  hasPackageScript,
  includesContractSnippet,
  missingMarkdownHeadings,
  packageScriptRuns,
} from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required product-learning file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected product-learning text: ${snippet}`);
    }
  }
}

function requireHeadings(file, headings) {
  const content = readProjectFile(file);

  for (const heading of missingMarkdownHeadings(content, headings)) {
    failures.push(`${file} is missing expected product-learning heading: ${formatMarkdownHeadingExpectation(heading)}`);
  }
}

function requirePackageScript(scriptName, expectedCommand) {
  const content = readProjectFile("package.json");

  if (!hasPackageScript(content, scriptName, expectedCommand)) {
    failures.push(`package.json scripts.${scriptName} must be "${expectedCommand}"`);
  }
}

function requirePackageScriptRun(parentScriptName, childScriptName) {
  const content = readProjectFile("package.json");

  if (!packageScriptRuns(content, parentScriptName, childScriptName)) {
    failures.push(`package.json scripts.${parentScriptName} must run npm run ${childScriptName}`);
  }
}

console.log("Product learning contract report");

requireHeadings("docs/PRODUCT_LEARNING.md", [
  { depth: 1, text: "Product Learning And Feedback Contract" },
  { depth: 2, text: "Product Standard" },
  { depth: 2, text: "Current Learning Boundary" },
  { depth: 2, text: "Feedback And Decision Inputs" },
  { depth: 2, text: "Future Analytics Experiments And Feature Flags" },
  { depth: 2, text: "Delivery Metrics And Review Cadence" },
  { depth: 2, text: "Change Rules" },
  { depth: 2, text: "Verification" },
]);

requireSnippets("docs/PRODUCT_LEARNING.md", [
  "The current app has no product analytics, experimentation platform, feature flag service, A/B testing, in-app survey, support CRM, or DORA dashboard.",
  "Local practice history and in-app charts are learner-owned product features, not production analytics sent to the project owner.",
  "Feature flags are allowed first as static or local development controls for release safety, not as hidden production experiments.",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, product-scope, observability, privacy, legal, runtime-surface, release, or operations changes.",
]);

requirePackageScript("product:learning", "node scripts/check-product-learning-contract.mjs");
requirePackageScriptRun("check", "product:learning");

requireSnippets("CONTRIBUTING.md", [
  "For product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes, keep [docs/PRODUCT_LEARNING.md](docs/PRODUCT_LEARNING.md) aligned and run the product-learning contract check:",
  "npm run product:learning",
  "Keep [docs/PRODUCT_LEARNING.md](docs/PRODUCT_LEARNING.md) aligned when changing product feedback, analytics, experiments, feature flags, surveys, support loops, product metrics, delivery metrics, DORA expectations, roadmap validation, or product-learning expectations; run `npm run product:learning` after product-learning-sensitive changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Product-learning impact was considered for feedback loops, future analytics, experiments, feature flags, support signals, delivery metrics, and roadmap validation.",
]);

requireSnippets("docs/QUALITY.md", [
  "Product-learning docs and `npm run product:learning` stay aligned when feedback loops, future analytics, experiments, feature flags, support signals, product metrics, delivery metrics, DORA expectations, or roadmap validation changes.",
  "For product-learning feedback:",
  "npm run product:learning",
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run product:learning` still proves feedback-loop boundaries, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review/release guidance are aligned.",
  "Confirm [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md) still reflects feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review cadence; run `npm run product:learning` after product-learning-sensitive changes.",
]);

requireSnippets("docs/PRODUCT_SCOPE.md", [
  "Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.",
]);

requireSnippets("docs/REVIEW_PROCESS.md", [
  "Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
]);

requireSnippets("docs/OBSERVABILITY.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
]);

requireSnippets("docs/OPERATIONS.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.",
]);

requireSnippets("docs/SECURITY_PRIVACY.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Future product analytics, experiments, surveys, support tooling, feature flags, or delivery metrics must follow [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md) before implementation.",
]);

requireSnippets("docs/LEGAL.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
]);

requireSnippets("docs/DATA_CONTRACT.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
]);

requireSnippets("docs/TESTING.md", [
  "npm run product:learning",
  "product-learning governance stays part of the foundation contract gate",
]);

requireSnippets("docs/adr/README.md", ["ADR 0047: Add Product Learning And Feedback Contract"]);

requireSnippets("CHANGELOG.md", [
  "Product-learning and feedback contract with `docs/PRODUCT_LEARNING.md` and `npm run product:learning` for feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review/release guidance",
]);

console.log("- feedback-loop and no-analytics boundary checked");
console.log("- future analytics, experiment, feature-flag, and delivery-metric guidance checked");
console.log("- governance, release, privacy, legal, observability, and operations links checked");

if (failures.length > 0) {
  console.error("\nProduct learning contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Product learning contract check passed.");
