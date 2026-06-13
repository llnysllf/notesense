# ADR 0031: Add Operations Runbook

## Status

Accepted

## Context

NoteSense has strong local and GitHub quality gates, release verification, repository governance checks, and live deployment checks. Those controls show whether a release is healthy, but the operational response was spread across release, security, backend-readiness, and threat-model documents.

A production-quality project should make operational ownership explicit even while the app is still static and local-first. The current version does not need telemetry or a support platform, but it does need a clear runbook for health signals, incident triggers, triage, rollback, evidence handling, and future observability expectations.

## Decision

Add `docs/OPERATIONS.md` as the operations runbook and include it in the policy docs gate.

The runbook documents:

- supported production surface
- release-health signals
- post-release verification
- incident triggers
- triage flow
- rollback and fix-forward expectations
- current no-telemetry observability boundary
- future observability requirements before accounts, sync, APIs, or managed storage
- artifact and evidence handling

## Consequences

- Operations expectations become part of the reviewed project foundation rather than tribal process.
- Future release, deployment, PWA, repository-governance, backend, telemetry, or monitoring changes must keep operations docs aligned.
- The app stays privacy-respecting today while still naming the observability work required before hosted user data exists.
