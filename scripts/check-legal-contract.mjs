import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required legal file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function readJson(file) {
  const content = readProjectFile(file);

  if (!content) {
    return undefined;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected legal text: ${snippet}`);
    }
  }
}

console.log("Legal contract report");

requireSnippets("LICENSE", [
  "Copyright (c) 2026 NoteSense contributors",
  "All rights reserved.",
  "This repository is publicly visible for portfolio review and project evaluation, but it is not open source.",
  "No permission is granted to copy, modify, distribute, sublicense, or use the source code or assets except with prior written permission from the project owner.",
  "Third-party dependencies remain governed by their own licenses.",
]);

requireSnippets("CODE_OF_CONDUCT.md", [
  "# Code Of Conduct",
  "## Standard",
  "## Unacceptable Behavior",
  "## Reporting",
  "## Enforcement",
  "## Scope",
  "## Change Rules",
  "This Code of Conduct applies to participation in the NoteSense repository and project-managed spaces.",
  "It does not change the project license, grant source-code rights, or create a formal support commitment.",
  "Run `npm run legal:check` and `npm run docs:check` after conduct-policy changes.",
]);

const packageJson = readJson("package.json");
if (packageJson) {
  if (packageJson.private !== true) {
    failures.push("package.json must keep private: true while project distribution is not open source");
  }

  if (packageJson.license !== "UNLICENSED") {
    failures.push('package.json must set license to "UNLICENSED" while the project is all rights reserved');
  }
}

const packageLock = readJson("package-lock.json");
if (packageLock) {
  if (packageLock.packages?.[""]?.license !== "UNLICENSED") {
    failures.push('package-lock.json root package metadata must set license to "UNLICENSED"');
  }
}

requireSnippets("docs/LEGAL.md", [
  "# Legal And Licensing Contract",
  "## Project License",
  "## User-Facing Legal Surface",
  "## Community Conduct",
  "## Dependency License Boundary",
  "## Change Rules",
  "## Verification",
  "The root [LICENSE](../LICENSE) file is the source of truth for project source code and owned assets.",
  "The current project license is all rights reserved.",
  '`package.json` uses `license: "UNLICENSED"` and `private: true` so npm metadata does not imply open-source distribution rights.',
  "Add user-facing Terms of Service before shipping hosted accounts, payments, subscriptions, collaboration, public sharing, user-generated cloud content, or a formal support channel.",
  "Add an externally hosted privacy policy before collecting production telemetry, analytics, account data, sync data, or backend logs tied to users.",
  "The root [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) file defines expected behavior for issues, pull requests, reviews, and project-managed discussion.",
  "The Code of Conduct does not change project license terms, grant source-code rights, or replace security/privacy reporting guidance.",
  "Dependency license compliance covers installed third-party packages, not the license for NoteSense's own source code.",
  "Run `npm run legal:check` after changing the root license, package license metadata, legal docs, user-facing terms, privacy-policy hosting, contributor community expectations, code-of-conduct expectations, dependency license policy, release guidance, or PR review guidance.",
]);

requireSnippets("README.md", ["[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)", "[docs/LEGAL.md](docs/LEGAL.md)"]);

requireSnippets("package.json", [
  '"license": "UNLICENSED"',
  '"legal:check": "node scripts/check-legal-contract.mjs"',
  "npm run dependencies:check && npm run legal:check && npm run data:check",
]);

requireSnippets("CONTRIBUTING.md", [
  "For legal, licensing, user-facing terms, privacy-policy hosting, contributor-community, or project-license metadata changes, keep [docs/LEGAL.md](docs/LEGAL.md) aligned and run the legal contract check:",
  "npm run legal:check",
  "Keep [docs/LEGAL.md](docs/LEGAL.md) aligned when changing root license terms, package license metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, dependency license policy, release guidance, or PR review guidance; run `npm run legal:check` after legal-sensitive changes.",
  "Participation in issues, pull requests, reviews, and project-managed discussion should follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).",
  "Keep [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) aligned when changing contributor-community, moderation, reporting, participation, or conduct expectations.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Legal/licensing impact was considered for root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor community expectations, code-of-conduct expectations, and dependency license policy.",
]);

requireSnippets("docs/QUALITY.md", [
  "Legal/licensing docs and `npm run legal:check` stay aligned when root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, code-of-conduct expectations, dependency license policy, release guidance, or PR review guidance changes.",
  "For legal/licensing feedback:",
  "npm run legal:check",
  "`docs/LEGAL.md` defines the project license boundary, user-facing legal triggers, community-conduct expectations, dependency-license separation, and legal-change process.",
  "`npm run legal:check` verifies root license terms, package metadata, legal docs, code-of-conduct expectations, dependency-license boundaries, release guidance, and PR review guidance stay aligned.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat legal/licensing results as release evidence when root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, code-of-conduct expectations, dependency license policy, release guidance, or PR review guidance changes.",
  "Whether `npm run legal:check` still proves project license, package metadata, legal docs, code-of-conduct expectations, dependency-license boundaries, release guidance, and PR review guidance are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/LEGAL.md` documents the project license boundary, user-facing legal triggers, community-conduct expectations, dependency-license separation, and legal-change process.",
  "`scripts/check-legal-contract.mjs` owns legal/licensing drift checks for the root license, package metadata, legal docs, code-of-conduct expectations, dependency-license boundaries, release guidance, and PR review guidance.",
  "Legal/licensing changes should keep root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, code-of-conduct expectations, dependency license policy, release guidance, and PR review guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run legal:check",
  "legal/licensing and conduct governance stays part of the foundation contract gate",
]);

requireSnippets("docs/DEPENDENCY_MAINTENANCE.md", [
  "Project licensing expectations live in [LEGAL.md](LEGAL.md).",
  "Dependency license compliance does not grant project source-code rights; the root project license stays governed by [LEGAL.md](LEGAL.md) and [../LICENSE](../LICENSE).",
]);

requireSnippets("docs/SECURITY_PRIVACY.md", [
  "Legal and licensing expectations live in [LEGAL.md](LEGAL.md).",
  "Run `npm run legal:check` before adding user-facing terms, externally hosted privacy policies, contributor-community terms, production telemetry, analytics, account data, sync data, or backend logs tied to users.",
]);

requireSnippets("docs/adr/README.md", [
  "ADR 0044: Add Legal And License Contract",
  "ADR 0051: Add Code Of Conduct Contract",
]);

requireSnippets("CHANGELOG.md", [
  'Legal/licensing contract with a root `LICENSE`, `docs/LEGAL.md`, `license: "UNLICENSED"`, and `npm run legal:check` for project-license, package metadata, user-facing legal, dependency-license boundary, and review/release guidance',
  "Code of Conduct policy for repository participation, reporting, enforcement, and legal-contract alignment",
]);

console.log("- project license and package metadata checked");
console.log("- legal docs, conduct policy, and user-facing legal triggers checked");
console.log("- governance, release, and dependency-license links checked");

if (failures.length > 0) {
  console.error("\nLegal contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Legal contract check passed.");
