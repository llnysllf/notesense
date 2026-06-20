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
    failures.push(`missing required observability file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected observability text: ${snippet}`);
    }
  }
}

function requireHeadings(file, headings) {
  const content = readProjectFile(file);

  for (const heading of missingMarkdownHeadings(content, headings)) {
    failures.push(`${file} is missing expected observability heading: ${formatMarkdownHeadingExpectation(heading)}`);
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

console.log("Observability contract report");

requireHeadings("docs/OBSERVABILITY.md", [
  { depth: 1, text: "Observability And Incident Learning Contract" },
  { depth: 2, text: "Product Standard" },
  { depth: 2, text: "Current Visibility Boundary" },
  { depth: 2, text: "Future Signal Rules" },
  { depth: 2, text: "Incident Learning" },
  { depth: 2, text: "SLO And SLA Boundary" },
  { depth: 2, text: "Change Rules" },
  { depth: 2, text: "Verification" },
]);

requireSnippets("docs/OBSERVABILITY.md", [
  "The app should never become blind to production failures once real users depend on it.",
  "Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).",
  "The current app has no production telemetry, analytics, real-user monitoring, remote logging, or support queue.",
  "`src/components/ErrorBoundary.tsx` provides a learner-facing recovery surface and sends bounded render-failure reports through `src/observability.ts`, which currently logs only to the browser console for development and future client-side error reporting.",
  "`src/observability.ts` owns the current local-only render-failure report shape and must not add telemetry, network delivery, durable identifiers, practice content, imported/exported data, raw LocalStorage, audio, or keystroke capture.",
  "Client error reporting must be privacy reviewed before implementation.",
  "Denied future signals include practice answers, note-level progress, session history, imported/exported JSON contents, raw LocalStorage, audio recordings, keystrokes, precise IP-derived location, full URLs with query strings, and stable cross-site identifiers.",
  "User-impacting production incidents should leave an incident review using [POSTMORTEM_TEMPLATE.md](POSTMORTEM_TEMPLATE.md).",
  "DORA-style metrics such as lead time, deployment frequency, change-failure rate, and MTTR should be introduced only after the release process has enough real production history to make those metrics meaningful.",
  "NoteSense does not currently promise an external SLA.",
  "Run `npm run observability:check` after observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA-metric, support, support-policy, operations, privacy, security, legal, runtime-surface, release, or backend-readiness changes.",
]);

requireHeadings("docs/POSTMORTEM_TEMPLATE.md", [
  { depth: 1, text: "Incident Review Template" },
  { depth: 2, text: "Summary" },
  { depth: 2, text: "Impact" },
  { depth: 2, text: "Detection" },
  { depth: 2, text: "Timeline" },
  { depth: 2, text: "Root Cause" },
  { depth: 2, text: "Resolution" },
  { depth: 2, text: "Prevention" },
  { depth: 2, text: "Follow-Ups" },
  { depth: 2, text: "Evidence" },
]);

requireSnippets("docs/POSTMORTEM_TEMPLATE.md", [
  "Missing signals that would have reduced detection time:",
  "Why existing checks, review, or monitoring did not catch it earlier:",
]);

requirePackageScript("observability:check", "node scripts/check-observability-contract.mjs");
requirePackageScriptRun("check", "observability:check");

requireSnippets("CONTRIBUTING.md", [
  "For observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, support, or production-visibility changes, keep [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) aligned and run the observability contract check:",
  "npm run observability:check",
  "Keep [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) aligned when changing production visibility, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA metrics, support expectations, or production signal ownership; run `npm run observability:check` after observability-sensitive changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Observability impact was considered for production visibility, telemetry boundaries, incident learning, SLO/SLA expectations, support, and future monitoring.",
]);

requireSnippets("docs/QUALITY.md", [
  "Observability docs and `npm run observability:check` stay aligned when production visibility, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA metrics, support expectations, or production signal ownership changes.",
  "For observability feedback:",
  "npm run observability:check",
  "`docs/OBSERVABILITY.md` defines the current production visibility boundary, future signal rules, incident-learning expectations, and SLO/SLA boundary.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat observability results as release evidence when production visibility, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA metrics, support expectations, or production signal ownership changes.",
  "Whether `npm run observability:check` still proves production-visibility boundaries, future telemetry rules, incident-review templates, SLO/SLA expectations, and review/release guidance are aligned.",
]);

requireSnippets("docs/OPERATIONS.md", [
  "Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).",
  "Use [POSTMORTEM_TEMPLATE.md](POSTMORTEM_TEMPLATE.md) for user-impacting production incidents and process gaps that should teach the project something durable.",
  "Run `npm run observability:check` after observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA-metric, support, or production-visibility changes.",
]);

requireSnippets("docs/SECURITY_PRIVACY.md", [
  "Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).",
  "Future telemetry, analytics, monitoring SDKs, remote logging, or error-reporting sinks must follow [OBSERVABILITY.md](OBSERVABILITY.md) before implementation.",
  "Future product analytics, experiments, surveys, support tooling, feature flags, or delivery metrics must follow [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md) before implementation.",
]);

requireSnippets("docs/LEGAL.md", [
  "Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).",
  "Production telemetry, analytics, monitoring, remote logging, or support commitments must update legal, privacy, and observability expectations together before implementation.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/OBSERVABILITY.md` documents the production visibility boundary, future signal rules, incident-learning expectations, and SLO/SLA boundary.",
  "`src/observability.ts` owns the current local-only render-failure report shape for the error boundary.",
  "`scripts/check-observability-contract.mjs` owns observability drift checks for production visibility, future telemetry rules, incident review templates, SLO/SLA boundaries, release guidance, and PR review guidance.",
  "Observability changes should keep production visibility, telemetry boundaries, incident learning, SLO/SLA expectations, support, operations, privacy, security, legal, release, backend-readiness, and PR review guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run observability:check",
  "observability governance stays part of the foundation contract gate",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).",
  "Before backend launch, define privacy-safe production signals, incident review ownership, SLO/SLA boundaries, and telemetry retention.",
]);

requireSnippets("docs/THREAT_MODEL.md", [
  "Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).",
  "Future telemetry or monitoring must avoid collecting practice content, imported files, exported files, keystrokes, audio, raw LocalStorage, and unnecessary identifiers.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0045: Add Observability And Incident Learning Contract"]);

requireSnippets("CHANGELOG.md", [
  "Local-only render-failure reporting helper with bounded report shape and focused unit coverage",
  "Observability and incident-learning contract with `docs/OBSERVABILITY.md`, `docs/POSTMORTEM_TEMPLATE.md`, and `npm run observability:check` for production visibility, future telemetry rules, incident reviews, SLO/SLA boundaries, and review/release guidance",
]);

console.log("- production visibility boundary checked");
console.log("- incident review and SLO/SLA guidance checked");
console.log("- governance, release, privacy, legal, and operations links checked");

if (failures.length > 0) {
  console.error("\nObservability contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Observability contract check passed.");
