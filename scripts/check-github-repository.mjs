import { execFileSync } from "node:child_process";

const REPOSITORY = process.env.GITHUB_REPOSITORY ?? "llnysllf/notesense";
const DEFAULT_BRANCH = "main";
const EXPECTED_REQUIRED_CHECKS = [
  "Quality gate",
  "Visual regression",
  "Lighthouse audit",
  "Analyze JavaScript and TypeScript",
  "Dependency review",
];
const EXPECTED_ACTIVE_WORKFLOWS = [
  "CI",
  "CodeQL",
  "Dependency Review",
  "Deploy Pages",
  "Lighthouse",
  "Visual Regression",
  "Dependabot Updates",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runGh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readGhJson(args) {
  const output = runGh(args);
  assert(output, `gh ${args.join(" ")} returned an empty response`);
  return JSON.parse(output);
}

function formatList(values) {
  if (values.length === 0) {
    return "(none)";
  }

  return values.join(", ");
}

function compareSet(actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  return {
    extra: [...actualSet].filter((value) => !expectedSet.has(value)).sort(),
    missing: [...expectedSet].filter((value) => !actualSet.has(value)).sort(),
  };
}

function checkEqual(actual, expected, label, failures, passed) {
  if (actual === expected) {
    passed.push(label);
    return;
  }

  failures.push(`${label} must be ${String(expected)}; found ${String(actual)}`);
}

function checkRequiredChecks(protection, failures, passed) {
  const requiredChecks = protection.required_status_checks?.contexts ?? [];
  const { extra, missing } = compareSet(requiredChecks, EXPECTED_REQUIRED_CHECKS);

  if (missing.length > 0 || extra.length > 0) {
    failures.push(`required status checks mismatch; missing: ${formatList(missing)}; extra: ${formatList(extra)}`);
    return;
  }

  passed.push("required status checks match policy");
}

function checkBranchProtection(protection, failures, passed) {
  checkEqual(
    protection.required_status_checks?.strict,
    true,
    "required checks use strict branch updates",
    failures,
    passed,
  );
  checkRequiredChecks(protection, failures, passed);

  const reviews = protection.required_pull_request_reviews;
  checkEqual(reviews?.required_approving_review_count, 1, "required approving review count", failures, passed);
  checkEqual(reviews?.require_code_owner_reviews, true, "CODEOWNERS review requirement", failures, passed);
  checkEqual(reviews?.dismiss_stale_reviews, true, "stale review dismissal", failures, passed);
  checkEqual(reviews?.require_last_push_approval, false, "last-push approval requirement", failures, passed);
  checkEqual(
    protection.required_conversation_resolution?.enabled,
    true,
    "conversation resolution requirement",
    failures,
    passed,
  );
  checkEqual(protection.required_linear_history?.enabled, true, "linear history requirement", failures, passed);
  checkEqual(protection.allow_force_pushes?.enabled, false, "force-push protection", failures, passed);
  checkEqual(protection.allow_deletions?.enabled, false, "branch deletion protection", failures, passed);
  checkEqual(protection.enforce_admins?.enabled, false, "admin enforcement setting", failures, passed);
}

function checkRepositorySettings(repository, failures, passed) {
  checkEqual(repository.visibility, "public", "repository visibility", failures, passed);
  checkEqual(repository.default_branch, DEFAULT_BRANCH, "default branch", failures, passed);
  checkEqual(repository.has_pages, true, "GitHub Pages enabled", failures, passed);
  checkEqual(repository.archived, false, "repository archived state", failures, passed);
  checkEqual(repository.disabled, false, "repository disabled state", failures, passed);
  checkEqual(repository.security_and_analysis?.secret_scanning?.status, "enabled", "secret scanning", failures, passed);
  checkEqual(
    repository.security_and_analysis?.secret_scanning_push_protection?.status,
    "enabled",
    "secret scanning push protection",
    failures,
    passed,
  );
  checkEqual(
    repository.security_and_analysis?.dependabot_security_updates?.status,
    "enabled",
    "Dependabot security updates",
    failures,
    passed,
  );
}

function checkVulnerabilityAlerts(failures, passed) {
  try {
    runGh(["api", `repos/${REPOSITORY}/vulnerability-alerts`]);
    passed.push("Dependabot vulnerability alerts");
  } catch (error) {
    failures.push(`Dependabot vulnerability alerts must be enabled: ${error.message}`);
  }
}

function checkWorkflows(workflowsResponse, failures, passed) {
  const workflows = workflowsResponse.workflows ?? [];
  const workflowStates = new Map(workflows.map((workflow) => [workflow.name, workflow.state]));
  const missing = [];
  const inactive = [];

  for (const workflowName of EXPECTED_ACTIVE_WORKFLOWS) {
    const state = workflowStates.get(workflowName);

    if (!state) {
      missing.push(workflowName);
      continue;
    }

    if (state !== "active") {
      inactive.push(`${workflowName}:${state}`);
    }
  }

  if (missing.length > 0 || inactive.length > 0) {
    failures.push(`workflow policy mismatch; missing: ${formatList(missing)}; inactive: ${formatList(inactive)}`);
    return;
  }

  passed.push("expected GitHub Actions workflows are active");
}

console.log("GitHub repository governance report");
console.log(`- repository: ${REPOSITORY}`);

const failures = [];
const passed = [];

runGh(["--version"]);

const repository = readGhJson(["api", `repos/${REPOSITORY}`]);
const protection = readGhJson(["api", `repos/${REPOSITORY}/branches/${DEFAULT_BRANCH}/protection`]);
const workflows = readGhJson(["api", `repos/${REPOSITORY}/actions/workflows?per_page=100`]);

checkRepositorySettings(repository, failures, passed);
checkVulnerabilityAlerts(failures, passed);
checkBranchProtection(protection, failures, passed);
checkWorkflows(workflows, failures, passed);

for (const item of passed) {
  console.log(`- ${item}: passed`);
}

if (failures.length > 0) {
  console.error("\nGitHub repository governance failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("GitHub repository governance passed.");
