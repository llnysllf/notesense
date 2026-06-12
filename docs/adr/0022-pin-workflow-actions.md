# ADR 0022: Pin Workflow Actions

## Status

Accepted

## Context

GitHub Actions workflows are part of the release supply chain. Floating action refs such as `actions/checkout@v5` are convenient, but the referenced tag can move. A big-company-quality portfolio repo should make workflow execution reproducible and reviewable, especially now that branch protection requires CI, CodeQL, Lighthouse, and visual regression checks.

NoteSense already uses pinned Node/npm versions, lockfile installs, dependency audit, license checks, Dependabot, CodeQL, and branch protection. The missing supply-chain control is immutable GitHub Actions references.

## Decision

Pin every workflow `uses:` action reference to a full 40-character commit SHA and keep the source version tag as a trailing comment.

Add `npm run security:workflows` through `scripts/check-workflow-actions.mjs` to verify that:

- workflow action refs use full commit SHAs
- local action refs are allowed
- non-local action refs document the source version tag in a comment

Include the workflow policy check inside `npm run verify`.

## Consequences

- Workflow execution is more reproducible and less exposed to moved tags.
- Action upgrades require an explicit SHA update and source-version comment update.
- Dependabot or manual action updates must preserve pinning.
- Reviewers can see exactly which action commits run in CI, visual regression, Lighthouse, CodeQL, and Pages deployment.
