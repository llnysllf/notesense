# ADR 0046: Add Release Safety And Provenance Contract

## Status

Accepted

## Context

NoteSense already has strong local verification, GitHub Actions checks, release notes, live deployment verification, workflow pinning, and operations guidance. The remaining release-safety gap is that the current static app still deploys `main` directly to GitHub Pages, and the boundaries for staging, canary rollout, automated rollback, SBOMs, provenance, and signed artifacts were implied rather than explicitly governed.

A big-company-quality foundation should make that tradeoff honest. Direct-to-Pages can be acceptable for a static portfolio product, but it should not silently become the release model for hosted accounts, paid usage, classroom commitments, service-backed sync, or third-party-distributed artifacts.

## Decision

Add `docs/RELEASE_SAFETY.md` and `npm run release:safety`, backed by `scripts/check-release-safety-contract.mjs`. Include the check in `npm run check`.

The contract defines:

- the current direct-to-GitHub-Pages release boundary
- when staging, preview, canary, progressive rollout, feature flags, or automated rollback become required design work
- which release evidence should reconstruct what shipped
- when SBOMs, provenance attestations, signed artifacts, and stronger artifact verification should be introduced
- rollback and recovery expectations
- documentation and PR-review drift rules for release-safety changes

## Consequences

- The project stays honest about its current lightweight release model.
- Future deployment, workflow, Pages, staging, rollback, provenance, SBOM, signing, backend, legal, operations, or support changes must update the release-safety contract intentionally.
- The check complements existing release notes, operations, repository governance, workflow security, live deployment verification, and supply-chain gates instead of replacing human release judgment.
