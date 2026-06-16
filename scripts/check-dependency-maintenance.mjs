import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required dependency-maintenance file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected dependency-maintenance text: ${snippet}`);
    }
  }
}

console.log("Dependency maintenance report");

requireSnippets("docs/DEPENDENCY_MAINTENANCE.md", [
  "# Dependency Maintenance Contract",
  "## Sources",
  "## Dependabot Policy",
  "## Update Classes",
  "## Review Evidence",
  "## Change Rules",
  "## Verification",
  "npm major upgrades are ignored by Dependabot and should be opened as intentional engineering tasks.",
  "Run `npm run dependencies:check` after dependency-maintenance, Dependabot, lockfile-policy, license-policy, or workflow-update-policy changes.",
]);

requireSnippets("package.json", [
  '"dependencies:check": "node scripts/check-dependency-maintenance.mjs"',
  "npm run product:check && npm run product:learning && npm run review:check && npm run dependencies:check && npm run legal:check && npm run data:check",
  '"security:supply-chain": "npm run security:audit && npm run security:lockfile && npm run compliance:licenses && npm run security:workflows"',
  '"security:lockfile": "node scripts/check-lockfile-supply-chain.mjs"',
  '"compliance:licenses": "node scripts/check-licenses.mjs"',
  '"security:audit": "npm audit --audit-level=high"',
  '"security:workflows": "npm run security:workflow-actions && npm run security:workflow-permissions && npm run security:workflow-operations"',
  '"verify": "npm run security:supply-chain && npm run check',
]);

requireSnippets(".github/dependabot.yml", [
  "version: 2",
  "package-ecosystem: npm",
  "package-ecosystem: github-actions",
  "interval: weekly",
  "day: monday",
  'time: "09:00"',
  'time: "09:30"',
  "timezone: Pacific/Auckland",
  "open-pull-requests-limit: 5",
  "app-runtime:",
  "tooling:",
  "update-types:",
  "- minor",
  "- patch",
  "ignore:",
  'dependency-name: "*"',
  '"version-update:semver-major"',
]);

requireSnippets(".github/pull_request_template.md", [
  "Dependency maintenance impact was considered for Dependabot cadence, lockfile policy, license policy, supply-chain gates, major upgrades, and workflow action updates.",
]);

requireSnippets("CONTRIBUTING.md", [
  "For dependency-maintenance, Dependabot, package manager, lockfile-policy, license-policy, or workflow-update-policy changes, keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned and run the dependency-maintenance contract check:",
  "npm run dependencies:check",
  "Keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned when changing Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy; run `npm run dependencies:check` after dependency-maintenance changes.",
]);

requireSnippets("SECURITY.md", [
  "Dependency maintenance expectations live in [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md).",
  "Run `npm run dependencies:check` after Dependabot, dependency-maintenance, lockfile-policy, license-policy, package manager, or workflow-update-policy changes.",
]);

requireSnippets("docs/QUALITY.md", [
  "Dependency-maintenance docs and `npm run dependencies:check` stay aligned when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy changes.",
  "For dependency-maintenance feedback:",
  "npm run dependencies:check",
  "`docs/DEPENDENCY_MAINTENANCE.md` defines dependency sources, Dependabot policy, update classes, review evidence, and dependency-maintenance verification.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat dependency-maintenance results as release evidence when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy changes.",
  "Whether `npm run dependencies:check` still proves Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, and workflow-update expectations are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/DEPENDENCY_MAINTENANCE.md` documents dependency sources, Dependabot policy, update classes, review evidence, and dependency-maintenance verification.",
  "`scripts/check-dependency-maintenance.mjs` owns dependency-maintenance drift checks for Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, and workflow-update expectations.",
  "Dependency-maintenance changes should keep Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, release guidance, and contributor guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run dependencies:check",
  "dependency-maintenance governance stays part of the foundation contract gate",
]);

requireSnippets("docs/adr/README.md", [
  "Add an ADR when a change affects data ownership, deployment, quality gates, runtime policy, security posture, release process, service boundaries, or future backend direction.",
  "ADR 0039: Add Dependency Maintenance Contract",
]);

requireSnippets("CHANGELOG.md", [
  "Dependency-maintenance contract with `docs/DEPENDENCY_MAINTENANCE.md` and `npm run dependencies:check` for Dependabot cadence, lockfile policy, license policy, supply-chain gates, and workflow-update expectations",
]);

console.log("- Dependabot cadence and grouping checked");
console.log("- dependency maintenance docs and review evidence checked");
console.log("- supply-chain, release, and governance links checked");

if (failures.length > 0) {
  console.error("\nDependency maintenance check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Dependency maintenance check passed.");
