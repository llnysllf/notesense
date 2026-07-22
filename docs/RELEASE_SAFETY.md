# Release Safety And Provenance Contract

NoteSense can stay lightweight while it is a static local-first app, but releases should still be repeatable, reviewable, and recoverable. This contract defines the current direct-to-GitHub-Pages boundary, SBOM generation evidence, and the rules for adding staging, progressive rollout, published SBOM artifacts, provenance, signing, or automated rollback later.

## Product Standard

- A release should be reconstructable from source commit, dependency lockfile, CI run, build output, Pages artifact, and live deployment evidence.
- Deployment safety should match user commitment: a portfolio static app can use a lighter path than a paid, classroom, account-backed, or service-backed product.
- Release evidence should prove what shipped, how it was built, how it can be rolled back, and which checks protected it.
- Release process changes must preserve the local-first privacy boundary, least-privilege workflow policy, and auditable Git history.

## Current Release Boundary

- NoteSense currently deploys the `main` branch directly to GitHub Pages after reviewed pull requests merge, or after narrowly verified Dependabot minor and patch updates pass every required check.
- The current release path has no separate staging environment, canary rollout, progressive delivery system, automated rollback, published SBOM artifact, signed release artifact, or SLSA provenance attestation.
- The current release evidence is `npm run verify`, `npm run security:sbom`, GitHub Actions checks, pinned workflow actions, dependency lockfile policy, CodeQL, Dependency Review, Lighthouse, visual regression, Pages artifact deployment, and `npm run deploy:verify-live`.
- This direct-to-production path is acceptable only while NoteSense remains a static portfolio app with no hosted accounts, paid usage, formal support, classroom commitment, or service-backed sync.

## Pre-Production And Rollout Boundary

- Preview or staging environments should be introduced before releases depend on backend APIs, authentication, database migrations, paid usage, public classrooms, or customer commitments.
- Canary, progressive rollout, feature flags, and automated rollback should be designed before a release can affect account data, sync data, billing, support promises, or many real users at once.
- GitHub Pages environment protection, required reviewers, and repository governance should remain the release sign-off surface until a stronger deployment platform exists.
- Deployment workflow changes must keep branch protection, required checks, Pages settings, environment permissions, workflow permissions, and operations docs aligned.

## Provenance And Artifact Evidence

- Every release should identify the commit SHA, package-lock hash, Node/npm runtime, GitHub Actions run, Pages artifact, and live deployment verification result.
- `npm run security:sbom` generates and validates an SPDX 2.3 SBOM from the committed lockfile as part of the supply-chain gate.
- Published SBOM artifacts, provenance attestations, signed release artifacts, and automated rollback should be added before distributing installable builds, paid releases, or third-party-deployed artifacts.
- Future published SBOM or provenance output must be generated from the locked dependency graph and must not include secrets, LocalStorage exports, imported files, or user-private practice data.
- Signed artifacts or attestations should use least-privilege workflow identities, reviewed retention, and documented verification steps.

## Rollback And Recovery

- Rollback uses a normal Git revert and a fresh deployment through the same protected workflow.
- Force-pushing `main` is not an acceptable release recovery path.
- Rollback evidence should include the risky commit, revert commit, deployment run, live verifier result, and incident or follow-up notes when user impact occurred.
- Fix-forward is acceptable only when impact is understood and the verification evidence is stronger than the rollback path.

## Change Rules

- Run `npm run release:safety` after release-safety, deployment, staging, canary, progressive-rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, operations, observability, security, privacy, legal, or backend-readiness changes.
- Do not add a staging service, canary system, feature-flag platform, automated rollback, published SBOM artifact, signed artifact, or provenance attestation without updating this contract first.
- Keep release, operations, observability, security/privacy, legal, dependency-maintenance, quality, architecture, testing, backend-readiness, ADR, changelog, and PR review guidance aligned when release safety expectations change.

## Verification

`npm run release:safety` verifies that:

- this contract keeps product-standard, current-release-boundary, rollout-boundary, provenance/artifact, rollback/recovery, change-rule, and verification sections
- package scripts include release-safety governance in the local foundation gate
- deployment workflow expectations stay connected to Pages, permissions, environments, artifacts, and SBOM generation
- README, contributing, quality, release, operations, observability, security/privacy, legal, dependency-maintenance, architecture, testing, backend-readiness, ADR, changelog, and PR review guidance stay connected to release safety and provenance
