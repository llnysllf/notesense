# ADR 0045: Add Observability And Incident Learning Contract

## Status

Accepted

## Context

NoteSense has strong local checks, GitHub Actions, deployment verification, operations guidance, security/privacy rules, and an app error boundary. Those controls reduce release risk, but they do not fully answer what should happen when real production users hit failures that local and CI checks missed.

The app should not add telemetry casually, because the current product promise is local-first and privacy-respecting. It still needs a clear contract for future production visibility, incident reviews, SLO/SLA boundaries, and learning loops before accounts, sync, analytics, support, or paid usage exist.

## Decision

Add `docs/OBSERVABILITY.md`, `docs/POSTMORTEM_TEMPLATE.md`, and `npm run observability:check`, backed by `scripts/check-observability-contract.mjs`. Include the check in `npm run check`.

The contract covers:

- current no-telemetry visibility boundary
- privacy-safe future error-reporting and monitoring rules
- allowed and denied signal categories
- incident severity classification and incident review expectations
- SLO/SLA boundaries for the current static app
- DORA metric timing for future production history
- governance links across operations, security/privacy, legal, release, architecture, testing, backend readiness, threat model, ADRs, and PR review

## Consequences

- Production visibility becomes an explicit foundation concern instead of an afterthought.
- The project can improve incident learning without immediately adding telemetry or analytics.
- Future monitoring or analytics work must update privacy, security, legal, runtime-surface, operations, release, and ADR guidance intentionally.
- The check stays lightweight and complements `npm run operations:check`, `npm run security:privacy`, runtime-surface checks, release verification, and human review instead of replacing a real observability design.
