import { existsSync, readFileSync } from "node:fs";

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
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected product-learning text: ${snippet}`);
    }
  }
}

console.log("Product learning contract report");

requireSnippets("docs/PRODUCT_LEARNING.md", [
  "# Product Learning And Feedback Contract",
  "## Product Standard",
  "## Current Learning Boundary",
  "## Feedback And Decision Inputs",
  "## Future Analytics Experiments And Feature Flags",
  "## Delivery Metrics And Review Cadence",
  "## Change Rules",
  "## Verification",
  "The current app has no product analytics, experimentation platform, feature flag service, A/B testing, in-app survey, support CRM, or DORA dashboard.",
  "Current product learning comes from GitHub issues, pull-request review, manual learner testing, release evidence, incident reviews, and owner notes.",
  "Local practice history and in-app charts are learner-owned product features, not production analytics sent to the project owner.",
  "Do not add product analytics, A/B testing, remote feature flags, in-app surveys, session replay, or usage tracking without updating privacy, security, legal, observability, release, operations, product-scope, data, runtime-surface, and ADR guidance first.",
  "Feature flags are allowed first as static or local development controls for release safety, not as hidden production experiments.",
  "DORA-style metrics such as lead time, deployment frequency, change-failure rate, and MTTR should be introduced only after there is enough production release history to make them meaningful.",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, product-scope, observability, privacy, legal, runtime-surface, release, or operations changes.",
]);

requireSnippets("package.json", [
  '"product:learning": "node scripts/check-product-learning-contract.mjs"',
  "npm run docs:check && npm run adr:check && npm run product:check && npm run product:learning && npm run review:check",
]);

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
  "`docs/PRODUCT_LEARNING.md` defines the current no-analytics learning boundary, feedback inputs, future analytics/experiment rules, feature-flag expectations, delivery-metric timing, and review cadence.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat product-learning results as release evidence when feedback loops, future analytics, experiments, feature flags, support signals, product metrics, delivery metrics, DORA expectations, or roadmap validation changes.",
  "Whether `npm run product:learning` still proves feedback-loop boundaries, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review/release guidance are aligned.",
  "Confirm [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md) still reflects feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review cadence; run `npm run product:learning` after product-learning-sensitive changes.",
]);

requireSnippets("docs/PRODUCT_SCOPE.md", [
  "Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.",
]);

requireSnippets("docs/REVIEW_PROCESS.md", [
  "Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Product proposals should include the intended learning signal before implementation.",
]);

requireSnippets("docs/OBSERVABILITY.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Analytics or product-usage events require a separate product-learning and privacy decision before implementation.",
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
  "Product analytics, experiments, surveys, support tooling, session replay, or remote feature flags must update legal, privacy, product-learning, and observability expectations together before implementation.",
]);

requireSnippets("docs/DATA_CONTRACT.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Future product analytics, experiments, surveys, support tooling, or remote feature flags must not collect practice answers, note-level progress, session history, imported/exported JSON contents, raw LocalStorage, audio recordings, keystrokes, precise location, or stable cross-site identifiers without a new product, privacy, legal, security, and data-contract decision.",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "Before backend launch, define privacy-safe product feedback, support, experiment, feature-flag, and delivery-metric boundaries.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/PRODUCT_LEARNING.md` documents product feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review cadence.",
  "`scripts/check-product-learning-contract.mjs` owns product-learning drift checks for feedback loops, future analytics, experiments, feature flags, delivery metrics, release guidance, and PR review guidance.",
  "Product-learning changes should keep feedback loops, future analytics, experiments, feature flags, support signals, delivery metrics, product scope, observability, privacy, legal, release, operations, backend-readiness, and PR review guidance aligned.",
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
