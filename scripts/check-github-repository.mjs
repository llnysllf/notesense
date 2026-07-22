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
const GITHUB_ACTIONS_INTEGRATION_ID = 15368;
const MAIN_RULESET_NAME = "Main branch protection";
const EXPECTED_ACTIVE_WORKFLOWS = [
  "CI",
  "CodeQL",
  "Dependabot auto-merge",
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

function checkRequiredChecks(parameters, failures, passed) {
  const requiredChecks = (parameters.required_status_checks ?? []).map((check) => check.context);
  const { extra, missing } = compareSet(requiredChecks, EXPECTED_REQUIRED_CHECKS);

  if (missing.length > 0 || extra.length > 0) {
    failures.push(`required status checks mismatch; missing: ${formatList(missing)}; extra: ${formatList(extra)}`);
    return;
  }

  passed.push("required status checks match policy");
}

function getRule(ruleset, type, failures) {
  const rule = ruleset.rules?.find((candidate) => candidate.type === type);

  if (!rule) {
    failures.push(`${MAIN_RULESET_NAME} is missing the ${type} rule`);
  }

  return rule;
}

function checkMainRuleset(ruleset, failures, passed) {
  checkEqual(ruleset.enforcement, "active", "main ruleset enforcement", failures, passed);

  const includedRefs = ruleset.conditions?.ref_name?.include ?? [];
  const excludedRefs = ruleset.conditions?.ref_name?.exclude ?? [];
  checkEqual(
    JSON.stringify(includedRefs),
    JSON.stringify(["~DEFAULT_BRANCH"]),
    "main ruleset included refs",
    failures,
    passed,
  );
  checkEqual(JSON.stringify(excludedRefs), JSON.stringify([]), "main ruleset excluded refs", failures, passed);

  const bypassActors = ruleset.bypass_actors ?? [];
  const expectedBypassActors = [
    { actor_id: GITHUB_ACTIONS_INTEGRATION_ID, actor_type: "Integration", bypass_mode: "pull_request" },
  ];
  checkEqual(
    JSON.stringify(bypassActors),
    JSON.stringify(expectedBypassActors),
    "main ruleset bypass actors",
    failures,
    passed,
  );

  const statusChecks = getRule(ruleset, "required_status_checks", failures);
  checkEqual(
    statusChecks?.parameters?.strict_required_status_checks_policy,
    true,
    "required checks use strict branch updates",
    failures,
    passed,
  );
  checkEqual(
    statusChecks?.parameters?.do_not_enforce_on_create,
    false,
    "required checks enforce on branch creation",
    failures,
    passed,
  );
  checkRequiredChecks(statusChecks?.parameters ?? {}, failures, passed);

  const reviews = getRule(ruleset, "pull_request", failures)?.parameters;
  checkEqual(reviews?.required_approving_review_count, 1, "required approving review count", failures, passed);
  checkEqual(reviews?.require_code_owner_review, true, "CODEOWNERS review requirement", failures, passed);
  checkEqual(reviews?.dismiss_stale_reviews_on_push, true, "stale review dismissal", failures, passed);
  checkEqual(reviews?.require_last_push_approval, false, "last-push approval requirement", failures, passed);
  checkEqual(reviews?.required_review_thread_resolution, true, "conversation resolution requirement", failures, passed);
  checkEqual(
    JSON.stringify([...(reviews?.allowed_merge_methods ?? [])].sort()),
    JSON.stringify(["merge", "rebase", "squash"]),
    "allowed merge methods",
    failures,
    passed,
  );

  checkEqual(
    Boolean(getRule(ruleset, "required_linear_history", failures)),
    true,
    "linear history requirement",
    failures,
    passed,
  );
  checkEqual(Boolean(getRule(ruleset, "non_fast_forward", failures)), true, "force-push protection", failures, passed);
  checkEqual(Boolean(getRule(ruleset, "deletion", failures)), true, "branch deletion protection", failures, passed);
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
const rulesets = readGhJson(["api", `repos/${REPOSITORY}/rulesets`]);
const workflows = readGhJson(["api", `repos/${REPOSITORY}/actions/workflows?per_page=100`]);

const mainRulesetSummary = rulesets.find((ruleset) => ruleset.name === MAIN_RULESET_NAME);
if (!mainRulesetSummary?.id) {
  failures.push(`missing ${MAIN_RULESET_NAME} ruleset`);
} else {
  const mainRuleset = readGhJson(["api", `repos/${REPOSITORY}/rulesets/${mainRulesetSummary.id}`]);
  checkMainRuleset(mainRuleset, failures, passed);
}

checkRepositorySettings(repository, failures, passed);
checkVulnerabilityAlerts(failures, passed);
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
