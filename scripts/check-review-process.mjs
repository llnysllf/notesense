import { existsSync, readFileSync } from "node:fs";

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
    if (!content.includes(snippet)) {
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
  "Bug reports use `.github/ISSUE_TEMPLATE/bug_report.yml`.",
  "Product proposals use `.github/ISSUE_TEMPLATE/feature_proposal.yml`.",
  "Engineering tasks use `.github/ISSUE_TEMPLATE/engineering_task.yml`.",
  "Run `npm run review:check` after review, intake, issue-template, PR-template, CODEOWNERS, or triage-process changes.",
]);

requireSnippets("package.json", [
  '"review:check": "node scripts/check-review-process.mjs"',
  "npm run adr:check && npm run product:check && npm run review:check && npm run data:check",
]);

requireSnippets(".github/CODEOWNERS", ["* @llnysllf"]);

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
  "name: Security report",
  "url: https://github.com/llnysllf/notesense/security",
  "Please follow the security policy instead of opening public vulnerability details.",
]);

requireSnippets(".github/pull_request_template.md", [
  "## Summary",
  "## Quality Checklist",
  "`npm run verify` passes locally.",
  "Product-scope impact was considered for current scope, explicit non-goals, feature intake, and foundation-first expectations.",
  "Accessibility-contract impact was considered for source semantics, focus behavior, axe coverage, Lighthouse, and release guidance.",
  "Testing impact was considered for unit, component, browser, resilience, Pages, visual, coverage, and CI evidence.",
  "ADR impact was considered for decision numbering, status, index links, and required sections.",
  "Review/intake impact was considered for CODEOWNERS, issue templates, PR evidence, labels, and triage routing.",
  "## Risk Notes",
]);

requireSnippets("README.md", [
  "Review process: [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md)",
  "Run the review/intake contract check:",
  "npm run review:check",
  "`npm run review:check` verifies CODEOWNERS, issue templates, PR review evidence, security-report routing, and triage guidance stay aligned.",
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
  "Treat review/intake results as release evidence when CODEOWNERS, issue templates, PR templates, labels, triage routing, or review evidence expectations change.",
  "Whether `npm run review:check` still proves CODEOWNERS, issue templates, PR template, security routing, and review evidence stay aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/REVIEW_PROCESS.md` documents ownership, issue intake, triage, pull-request evidence, and review-process verification.",
  "`scripts/check-review-process.mjs` owns review/intake drift checks for CODEOWNERS, issue templates, PR template, security routing, and review evidence.",
  "Review-process changes should keep CODEOWNERS, issue templates, PR evidence, security routing, product-scope guidance, release guidance, and contributor guidance aligned.",
]);

requireSnippets("docs/PRODUCT_SCOPE.md", [
  "New features should not start as code.",
  "the learner problem",
  "why the current scope is insufficient",
]);

requireSnippets("docs/TESTING.md", [
  "A PR is not ready until the relevant test layer for the changed risk has evidence.",
]);

requireSnippets("docs/OPERATIONS.md", [
  "GitHub Actions, repository governance checks, live deployment verification, and user-reported issues are the current operational signal.",
  "Classify the issue as deployment, source behavior, dependency/security, repository governance, browser-specific, or documentation/process drift.",
]);

requireSnippets("SECURITY.md", [
  "Please avoid posting exploit details publicly.",
  "The `main` branch and the GitHub Pages deployment are the supported version.",
]);

requireSnippets("docs/adr/README.md", [
  "Add an ADR when a change affects data ownership, deployment, quality gates, runtime policy, security posture, release process, service boundaries, or future backend direction.",
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
