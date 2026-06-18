import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required release-safety file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected release-safety text: ${snippet}`);
    }
  }
}

console.log("Release safety contract report");

requireSnippets("docs/RELEASE_SAFETY.md", [
  "# Release Safety And Provenance Contract",
  "## Product Standard",
  "## Current Release Boundary",
  "## Pre-Production And Rollout Boundary",
  "## Provenance And Artifact Evidence",
  "## Rollback And Recovery",
  "## Change Rules",
  "## Verification",
  "NoteSense currently deploys the `main` branch directly to GitHub Pages after reviewed pull requests merge.",
  "The current release path has no separate staging environment, canary rollout, progressive delivery system, automated rollback, generated SBOM, signed release artifact, or SLSA provenance attestation.",
  "This direct-to-production path is acceptable only while NoteSense remains a static portfolio app with no hosted accounts, paid usage, formal support, classroom commitment, or service-backed sync.",
  "Every release should identify the commit SHA, package-lock hash, Node/npm runtime, GitHub Actions run, Pages artifact, and live deployment verification result.",
  "SBOM, provenance attestations, signed release artifacts, and automated rollback should be added before distributing installable builds, paid releases, or third-party-deployed artifacts.",
  "Rollback uses a normal Git revert and a fresh deployment through the same protected workflow.",
  "Force-pushing `main` is not an acceptable release recovery path.",
  "Run `npm run release:safety` after release-safety, deployment, staging, canary, progressive-rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, operations, observability, security, privacy, legal, or backend-readiness changes.",
]);

requireSnippets("package.json", [
  '"release:safety": "node scripts/check-release-safety-contract.mjs"',
  "npm run operations:check && npm run observability:check && npm run release:safety && npm run release:notes",
]);

requireSnippets(".github/workflows/deploy-pages.yml", [
  "name: Deploy Pages",
  "workflow_dispatch:",
  "branches:",
  "- main",
  "permissions: {}",
  "uses: actions/upload-pages-artifact@",
  "permissions:",
  "id-token: write",
  "pages: write",
  "environment:",
  "name: github-pages",
  "uses: actions/deploy-pages@",
]);

requireSnippets("CONTRIBUTING.md", [
  "For release-safety, deployment, staging, canary, progressive-rollout, rollback, provenance, SBOM, signing, artifact, Pages, or release-doc changes, keep [docs/RELEASE_SAFETY.md](docs/RELEASE_SAFETY.md) aligned and run the release-safety contract check:",
  "npm run release:safety",
  "Keep [docs/RELEASE_SAFETY.md](docs/RELEASE_SAFETY.md) aligned when changing release safety, deployment, staging, canary, progressive rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, operations, observability, security, privacy, legal, or backend-readiness expectations; run `npm run release:safety` after release-safety-sensitive changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Release-safety impact was considered for deployment, staging/canary needs, rollback, provenance, SBOM, signing, Pages artifacts, and release sign-off.",
]);

requireSnippets("docs/QUALITY.md", [
  "Release-safety docs and `npm run release:safety` stay aligned when deployment, staging, canary, progressive rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, operations, observability, security, privacy, legal, or backend-readiness expectations change.",
  "For release-safety feedback:",
  "npm run release:safety",
  "`docs/RELEASE_SAFETY.md` defines the current direct-to-Pages release boundary, rollout triggers, provenance/artifact expectations, and rollback/recovery rules.",
]);

requireSnippets("docs/RELEASE.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Treat release-safety results as release evidence when deployment, staging, canary, progressive rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, or release sign-off expectations change.",
  "Whether `npm run release:safety` still proves direct-to-Pages release boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, and release-review guidance are aligned.",
  "Confirm [RELEASE_SAFETY.md](RELEASE_SAFETY.md) still reflects release boundary, staging/canary triggers, rollback expectations, and provenance/artifact expectations; run `npm run release:safety` after release-safety-sensitive changes.",
]);

requireSnippets("docs/OPERATIONS.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Run `npm run release:safety` after release-safety, deployment, staging, canary, progressive-rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, or release-signoff changes.",
]);

requireSnippets("docs/OBSERVABILITY.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Release evidence should connect incident timelines to commit SHAs, deployment runs, Pages artifacts, and live verification results.",
]);

requireSnippets("docs/SECURITY_PRIVACY.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Future SBOM, provenance, signing, staging, canary, or automated rollback work must preserve least-privilege workflow identities and avoid exposing user-private practice data.",
]);

requireSnippets("docs/LEGAL.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "SBOMs, signed artifacts, provenance attestations, or externally distributed release packages must preserve the project license boundary before publication.",
]);

requireSnippets("docs/DEPENDENCY_MAINTENANCE.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "SBOM or provenance changes should be generated from the committed lockfile and reviewed with dependency-maintenance evidence.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/RELEASE_SAFETY.md` documents the direct-to-Pages release boundary, rollout triggers, provenance/artifact expectations, and rollback/recovery rules.",
  "`scripts/check-release-safety-contract.mjs` owns release-safety drift checks for deployment boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, release guidance, and PR review guidance.",
  "Release-safety changes should keep deployment, staging, canary, rollback, provenance, SBOM, signing, artifacts, Pages, workflow, operations, observability, security, privacy, legal, backend-readiness, and PR review guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run release:safety",
  "release-safety governance stays part of the foundation contract gate",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Before backend launch, define staging, migration rollback, deployment promotion, artifact provenance, and post-deploy verification expectations.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0046: Add Release Safety And Provenance Contract"]);

requireSnippets("CHANGELOG.md", [
  "Release-safety and provenance contract with `docs/RELEASE_SAFETY.md` and `npm run release:safety` for direct-to-Pages release boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, and release-review guidance",
]);

console.log("- direct-to-Pages release boundary checked");
console.log("- rollout, provenance, artifact, and rollback guidance checked");
console.log("- governance, release, operations, security, legal, and backend links checked");

if (failures.length > 0) {
  console.error("\nRelease safety contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release safety contract check passed.");
