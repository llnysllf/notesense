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
  "The current release path has no separate staging environment, canary rollout, progressive delivery system, automated rollback, published SBOM artifact, signed release artifact, or SLSA provenance attestation.",
  "This direct-to-production path is acceptable only while NoteSense remains a static portfolio app with no hosted accounts, paid usage, formal support, classroom commitment, or service-backed sync.",
  "`npm run security:sbom` generates and validates an SPDX 2.3 SBOM from the committed lockfile as part of the supply-chain gate.",
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
]);

requireSnippets("docs/RELEASE.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Whether `npm run release:safety` still proves direct-to-Pages release boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, and release-review guidance are aligned.",
  "Confirm [RELEASE_SAFETY.md](RELEASE_SAFETY.md) still reflects release boundary, staging/canary triggers, rollback expectations, and provenance/artifact expectations; run `npm run release:safety` after release-safety-sensitive changes.",
]);

requireSnippets("docs/OPERATIONS.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "Run `npm run release:safety` after release-safety, deployment, staging, canary, progressive-rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, or release-signoff changes.",
]);

requireSnippets("docs/OBSERVABILITY.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
]);

requireSnippets("docs/SECURITY_PRIVACY.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
]);

requireSnippets("docs/LEGAL.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
]);

requireSnippets("docs/DEPENDENCY_MAINTENANCE.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
  "SBOM or provenance changes should be generated from the committed lockfile, validated with `npm run security:sbom`, and reviewed with dependency-maintenance evidence.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run release:safety",
  "release-safety governance stays part of the foundation contract gate",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).",
]);

requireSnippets("docs/adr/README.md", ["ADR 0046: Add Release Safety And Provenance Contract"]);

requireSnippets("CHANGELOG.md", [
  "Release-safety and provenance contract with `docs/RELEASE_SAFETY.md` and `npm run release:safety` for direct-to-Pages release boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, and release-review guidance",
  "SBOM generation gate with `npm run security:sbom`, validating npm SPDX output from the committed lockfile inside the supply-chain release gate",
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
