# ADR 0027: Add Workflow Operations Policy

## Status

Accepted

## Context

NoteSense already checks that GitHub Actions use pinned commit SHAs and least-privilege token permissions. The workflow files also use concurrency groups, job timeouts, and short artifact-retention windows, but those controls were conventions rather than a verified policy.

Operational workflow drift can waste CI minutes, leave stale runs queued, keep debug artifacts longer than needed, or allow jobs to hang until platform defaults stop them.

## Decision

Add `npm run security:workflow-operations`, backed by `scripts/check-workflow-operations.mjs`, and include it in `npm run security:workflows`.

The policy requires:

- every workflow file to declare one top-level `concurrency` block
- `cancel-in-progress: true` for workflow concurrency
- every job to declare `timeout-minutes` between 1 and 20
- every `actions/upload-artifact` step to use `if-no-files-found: ignore`
- every `actions/upload-artifact` step to retain artifacts for 14 days or less

## Consequences

- CI reliability and cost controls are now enforced locally and in the main release gate.
- Future workflow additions must explicitly choose concurrency, timeout, and artifact-retention behavior.
- Long-running jobs or longer artifact retention require an intentional policy update and release documentation change.
