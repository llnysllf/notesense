# ADR 0042: Add Operations Contract Check

## Status

Accepted

## Context

NoteSense already has an operations runbook, live deployment verifier, repository governance check, workflow operations policy, release guide, quality runbook, threat model, and backend-readiness guide. Those controls describe how a static local-first app is released and recovered, but the operations runbook itself was only protected by broad policy-doc presence checks.

Operations expectations can drift when release-health signals, deployment verification, incident triggers, rollback guidance, evidence handling, monitoring, telemetry, support, or future observability assumptions change. A big-company-quality foundation should make that drift visible locally before a release process or incident response depends on stale runbook text.

## Decision

Add `npm run operations:check`, backed by `scripts/check-operations-contract.mjs`. Include the check in `npm run check`.

The check verifies:

- operations runbook sections for supported surface, health signals, post-release verification, incident triggers, triage, rollback, observability boundary, evidence handling, change rules, review cadence, and verification
- release-health signals, live deployment verification, repository governance, incident triage, rollback, and evidence-handling expectations
- README, contributing, quality, release, architecture, testing, security, threat-model, backend-readiness, ADR, changelog, and PR review guidance stay connected to operations

## Consequences

- Operations becomes a maintained foundation contract rather than only a runbook.
- Future release, deployment, repository-governance, PWA, security, privacy, backend-readiness, monitoring, telemetry, support, or rollback changes must update operations docs and checks intentionally.
- The check remains lightweight and local; it complements `npm run ops:repository`, `npm run deploy:verify-live`, workflow policy checks, release verification, and human review instead of replacing them.
