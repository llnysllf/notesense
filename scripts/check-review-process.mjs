import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required review-process file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected review-process text: ${snippet}`);
    }
  }
}

console.log("Review process report");

requireSnippets("docs/REVIEW_PROCESS.md", [
  "# Review And Intake Contract",
  "## Ownership",
  "## Intake Paths",
  "## Triage Rules",
  "## Pull Request Evidence",
  "## Change Rules",
  "## Verification",
  "Support expectations and non-SLA boundaries live in [../.github/SUPPORT.md](../.github/SUPPORT.md).",
  "Bug reports use `.github/ISSUE_TEMPLATE/bug_report.yml`.",
  "Product proposals use `.github/ISSUE_TEMPLATE/feature_proposal.yml`.",
  "Engineering tasks use `.github/ISSUE_TEMPLATE/engineering_task.yml`.",
  "Run `npm run review:check` after review, support-policy, intake, issue-template, PR-template, CODEOWNERS, or triage-process changes.",
]);

requireSnippets("package.json", [
  '"review:check": "node scripts/check-review-process.mjs"',
  "npm run adr:check && npm run product:check && npm run product:learning && npm run review:check && npm run dependencies:check && npm run legal:check && npm run data:check",
]);

requireSnippets(".github/CODEOWNERS", ["* @llnysllf"]);

requireSnippets(".github/SUPPORT.md", [
  "# Support Policy",
  "## Supported Surface",
  "## Where To Ask",
  "## Privacy And Data",
  "## Incident And Release Signals",
  "## Change Rules",
  "The supported version is the `main` branch deployed to GitHub Pages.",
  "There is no public SLA or guaranteed response time for support requests.",
  "Use the [bug report template](ISSUE_TEMPLATE/bug_report.yml) for broken, confusing, inaccessible, or unreliable behavior.",
  "Follow [SECURITY.md](../SECURITY.md) for vulnerabilities or security-sensitive reports. Do not post exploit details publicly.",
  "Run `npm run review:check` after support-policy, intake, issue-template, security-routing, or triage-process changes.",
]);

requireSnippets(".github/ISSUE_TEMPLATE/bug_report.yml", [
  "name: Bug Report",
  "labels:",
  "  - bug",
  "id: area",
  "label: Current Behavior",
  "label: Expected Behavior",
  "label: Reproduction Steps",
  "label: Browser",
  "label: Device Or Viewport",
  "label: Evidence",
  "Please avoid including private exported practice data unless it has been sanitized.",
]);

requireSnippets(".github/ISSUE_TEMPLATE/feature_proposal.yml", [
  "name: Product Proposal",
  "labels:",
  "  - product",
  "label: Learner Problem",
  "label: Desired Outcome",
  "label: Proposed Scope",
  "label: Risks And Tradeoffs",
  "This has clear learner value, not just project size value.",
  "This can preserve the current local-first practice loop.",
  "This can be tested with unit and/or browser coverage.",
]);

requireSnippets(".github/ISSUE_TEMPLATE/engineering_task.yml", [
  "name: Engineering Task",
  "labels:",
  "  - engineering",
  "label: Category",
  "label: Goal",
  "label: Acceptance Criteria",
  "label: Risk Notes",
  "`npm run verify` passes.",
  "Remote CodeQL checks pass when security-sensitive code or workflows change.",
]);

requireSnippets(".github/ISSUE_TEMPLATE/config.yml", [
  "blank_issues_enabled: false",
  "name: Support policy",
  "url: https://github.com/llnysllf/notesense/blob/main/.github/SUPPORT.md",
  "Read the supported surface, privacy guidance, and issue routing before opening a request.",
  "name: Security report",
  "url: https://github.com/llnysllf/notesense/security",
  "Please follow the security policy instead of opening public vulnerability details.",
]);

requireSnippets(".github/pull_request_template.md", [
  "## Summary",
  "## Quality Checklist",
  "`npm run verify` passes locally.",
  "ADR impact was considered for decision numbering, status, index links, and required sections.",
  "## Risk Notes",
]);

requireSnippets("CONTRIBUTING.md", [
  "For review, intake, issue-template, PR-template, CODEOWNERS, or triage-process changes, keep [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md) aligned and run the review/intake contract check:",
  "npm run review:check",
  "Keep [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md) aligned when changing CODEOWNERS, issue templates, PR template, review routing, labels, or triage expectations; run `npm run review:check` after review-process changes.",
]);

requireSnippets("docs/QUALITY.md", [
  "Review/intake docs and `npm run review:check` stay aligned when CODEOWNERS, issue templates, PR templates, labels, triage routing, or review evidence expectations change.",
  "For review/intake feedback:",
  "npm run review:check",
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run review:check` still proves CODEOWNERS, issue templates, PR template, security routing, and review evidence stay aligned.",
]);

requireSnippets("docs/PRODUCT_SCOPE.md", [
  "New features should not start as code.",
  "the learner problem",
  "why the current scope is insufficient",
]);

requireSnippets("docs/OPERATIONS.md", [
  "Support expectations and non-SLA boundaries live in [../.github/SUPPORT.md](../.github/SUPPORT.md).",
  "GitHub Actions, repository governance checks, live deployment verification, and user-reported issues are the current operational signal.",
  "Classify the issue as deployment, source behavior, dependency/security, repository governance, browser-specific, or documentation/process drift.",
]);

requireSnippets("docs/OBSERVABILITY.md", [
  "Support expectations and non-SLA boundaries live in [../.github/SUPPORT.md](../.github/SUPPORT.md).",
  "Run `npm run observability:check` after observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA-metric, support, support-policy, operations, privacy, security, legal, runtime-surface, release, or backend-readiness changes.",
]);

requireSnippets("SECURITY.md", [
  "Please avoid posting exploit details publicly.",
  "The `main` branch and the GitHub Pages deployment are the supported version.",
  "Support expectations and non-SLA boundaries live in [.github/SUPPORT.md](.github/SUPPORT.md).",
]);

console.log("- CODEOWNERS and issue templates checked");
console.log("- pull request template and security routing checked");
console.log("- review/intake docs and governance links checked");

if (failures.length > 0) {
  console.error("\nReview process check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Review process check passed.");
