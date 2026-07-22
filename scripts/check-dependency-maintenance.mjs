import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

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
    if (!includesContractSnippet(content, snippet)) {
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
  "SBOM or provenance changes should be generated from the committed lockfile, validated with `npm run security:sbom`, and reviewed with dependency-maintenance evidence.",
  "CodeQL GitHub Actions updates are grouped so `github/codeql-action/init` and `github/codeql-action/analyze` move together.",
  "Run `npm run dependencies:check` after dependency-maintenance, Dependabot, lockfile-policy, license-policy, SBOM-policy, or workflow-update-policy changes.",
]);

requireSnippets("package.json", [
  '"dependencies:check": "node scripts/check-dependency-maintenance.mjs"',
  "npm run product:check && npm run product:learning && npm run review:check && npm run dependencies:check && npm run legal:check && npm run data:check",
  '"security:supply-chain": "npm run security:audit && npm run security:lockfile && npm run compliance:licenses && npm run security:sbom && npm run security:workflows"',
  '"security:lockfile": "node scripts/check-lockfile-supply-chain.mjs"',
  '"compliance:licenses": "node scripts/check-licenses.mjs"',
  '"security:sbom": "node scripts/check-sbom.mjs"',
  '"security:audit": "npm audit --audit-level=high"',
  '"security:workflows": "npm run security:workflow-actions && npm run security:workflow-permissions && npm run security:workflow-operations"',
  '"verify": "npm run security:supply-chain && npm run check',
]);

const npmSchedule = `- package-ecosystem: npm
    directory: /
    schedule:
      interval: daily
      time: "09:00"
      timezone: Pacific/Auckland`;

const githubActionsSchedule = `- package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:30"
      timezone: Pacific/Auckland`;

requireSnippets(".github/dependabot.yml", [
  "version: 2",
  npmSchedule,
  githubActionsSchedule,
  "open-pull-requests-limit: 5",
  "app-runtime:",
  "tooling:",
  "codeql-action:",
  '"github/codeql-action/*"',
  "update-types:",
  "- minor",
  "- patch",
  "ignore:",
  'dependency-name: "*"',
  '"version-update:semver-major"',
]);

requireSnippets(".github/pull_request_template.md", [
  "Dependency maintenance impact was considered for Dependabot cadence, lockfile policy, license policy, SBOM policy, supply-chain gates, major upgrades, and workflow action updates.",
]);

requireSnippets("CONTRIBUTING.md", [
  "For dependency-maintenance, Dependabot, package manager, lockfile-policy, license-policy, SBOM-policy, or workflow-update-policy changes, keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned and run the dependency-maintenance contract check:",
  "npm run dependencies:check",
  "Keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned when changing Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, SBOM policy, or workflow-update policy; run `npm run dependencies:check` after dependency-maintenance changes.",
]);

requireSnippets("SECURITY.md", [
  "Dependency maintenance expectations live in [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md).",
  "Run `npm run dependencies:check` after Dependabot, dependency-maintenance, lockfile-policy, license-policy, SBOM-policy, package manager, or workflow-update-policy changes.",
]);

requireSnippets("docs/QUALITY.md", [
  "Dependency-maintenance docs and `npm run dependencies:check` stay aligned when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, SBOM policy, or workflow-update policy changes.",
  "For dependency-maintenance feedback:",
  "npm run dependencies:check",
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run dependencies:check` still proves Dependabot cadence, dependency review evidence, lockfile policy, license policy, SBOM policy, supply-chain gates, and workflow-update expectations are aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run dependencies:check",
  "dependency-maintenance governance stays part of the foundation contract gate",
]);

requireSnippets("docs/adr/README.md", ["ADR 0039: Add Dependency Maintenance Contract"]);

requireSnippets("CHANGELOG.md", [
  "Dependency-maintenance contract with `docs/DEPENDENCY_MAINTENANCE.md` and `npm run dependencies:check` for Dependabot cadence, lockfile policy, license policy, SBOM policy, supply-chain gates, and workflow-update expectations",
  "SBOM generation gate with `npm run security:sbom`, validating npm SPDX output from the committed lockfile inside the supply-chain release gate",
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
