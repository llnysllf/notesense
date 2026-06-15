import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required operations file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected operations text: ${snippet}`);
    }
  }
}

console.log("Operations contract report");

requireSnippets("docs/OPERATIONS.md", [
  "# Operations Runbook",
  "## Supported Surface",
  "## Health Signals",
  "## Post-Release Verification",
  "## Incident Triggers",
  "## Triage Flow",
  "## Rollback And Fix-Forward",
  "## Current Observability Boundary",
  "## Artifact And Evidence Handling",
  "## Change Rules",
  "## Review Cadence",
  "## Verification",
  "GitHub Actions, repository governance checks, live deployment verification, and user-reported issues are the current operational signal.",
  "Do not add telemetry, monitoring SDKs, backend APIs, or third-party services without updating privacy, security, runtime-surface, release, threat-model, backend-readiness, and operations docs together.",
  "Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).",
  "Use [POSTMORTEM_TEMPLATE.md](POSTMORTEM_TEMPLATE.md) for user-impacting production incidents and process gaps that should teach the project something durable.",
  "Run `npm run operations:check` after operations-runbook, release, deployment, PWA, repository-governance, security, privacy, backend-readiness, monitoring, telemetry, support, or rollback changes.",
  "Run `npm run observability:check` after observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA-metric, support, or production-visibility changes.",
  "Run `npm run ops:repository` after branch protection, required-check, repository security, Pages, or workflow-activation changes.",
]);

requireSnippets("package.json", [
  '"operations:check": "node scripts/check-operations-contract.mjs"',
  "npm run browsers:check && npm run performance:check && npm run operations:check && npm run observability:check && npm run release:notes",
  '"ops:repository": "node scripts/check-github-repository.mjs"',
  '"deploy:verify-live": "node scripts/verify-live-pages.mjs"',
  '"verify": "npm run security:supply-chain && npm run check && npm run test:e2e:resilience && npm run build:pages && npm run security:policy && npm run metadata:check && npm run pwa:check && npm run runtime:check && npm run perf:budget && npm run test:e2e:pages"',
]);

requireSnippets("README.md", [
  "Operations runbook: [docs/OPERATIONS.md](docs/OPERATIONS.md)",
  "Run the operations contract check:",
  "npm run operations:check",
  "`npm run operations:check` verifies release-health signals, post-release verification, incident triggers, triage, rollback, evidence handling, observability boundaries, and operations-review guidance stay aligned.",
  "`npm run ops:repository` verifies branch protection, required checks, repository security settings, vulnerability alerts, Pages, and active workflows against the reviewed governance policy.",
]);

requireSnippets("CONTRIBUTING.md", [
  "For release-health, incident-response, deployment ownership, monitoring, telemetry, support, rollback, or operations-doc changes, keep [docs/OPERATIONS.md](docs/OPERATIONS.md) aligned and run the operations contract check:",
  "npm run operations:check",
  "Keep [docs/OPERATIONS.md](docs/OPERATIONS.md) aligned when release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, monitoring, telemetry, or support expectations change; run `npm run operations:check` after operations-sensitive changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Operations-contract impact was considered for runbook sections, release-health signals, post-release verification, incident triage, rollback, evidence handling, and observability boundaries.",
]);

requireSnippets("docs/QUALITY.md", [
  "Operations runbook and `npm run operations:check` stay aligned when release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, monitoring, telemetry, or support expectations change.",
  "For operations feedback:",
  "npm run operations:check",
  "`npm run operations:check` verifies the runbook, release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, and operations-review guidance stay aligned.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat operations-contract results as release evidence when release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, monitoring, telemetry, or support expectations change.",
  "Whether `npm run operations:check` still proves release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, and operations-review guidance are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`scripts/check-operations-contract.mjs` owns operations-runbook drift checks for release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, and operations-review guidance.",
  "Operations-contract changes should keep release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, release guidance, security guidance, privacy guidance, backend-readiness guidance, and PR review guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run operations:check",
  "operations governance stays part of the foundation contract gate",
]);

requireSnippets("SECURITY.md", [
  "Operational health and incident-response expectations live in [docs/OPERATIONS.md](docs/OPERATIONS.md).",
  "Run `npm run ops:repository` after repository security, branch protection, required-check, Pages, or workflow-activation changes.",
]);

requireSnippets("docs/THREAT_MODEL.md", [
  "Observability plan for API errors, latency, and release health, aligned with [OPERATIONS.md](OPERATIONS.md).",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Extend the operations runbook with backend observability, rollback, and incident response details.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0042: Add Operations Contract Check"]);

requireSnippets("CHANGELOG.md", [
  "Operations contract check with `npm run operations:check` for release-health signals, post-release verification, incident triage, rollback, evidence handling, observability boundaries, and operations-review guidance",
]);

console.log("- operations runbook sections checked");
console.log("- release health, incident, rollback, and evidence guidance checked");
console.log("- operations docs and governance links checked");

if (failures.length > 0) {
  console.error("\nOperations contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Operations contract check passed.");
