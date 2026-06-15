# ADR 0043: Add Security And Privacy Contract

## Status

Accepted

## Context

NoteSense already has a privacy document, security policy, threat model, backend-readiness guide, data contract, runtime-surface gate, built CSP check, PWA artifact check, supply-chain checks, and release guidance. Those controls protect important security and privacy boundaries, but the overall readiness standard was spread across several documents and scripts.

Security/privacy drift can happen without visible product changes: a dependency update can change supply-chain risk, a service-worker change can expand cached behavior, a runtime API can introduce network or telemetry behavior, an import/export change can affect private local data, and future auth/sync work can change trust boundaries.

## Decision

Add `docs/SECURITY_PRIVACY.md` and `npm run security:privacy`, backed by `scripts/check-security-privacy.mjs`. Include the check in `npm run check`.

The check verifies:

- security/privacy contract sections for product standard, protected surface, runtime/build boundaries, future auth/sync rules, review/release evidence, change rules, and verification
- privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface, CSP, PWA, and supply-chain controls stay connected
- README, contributing, quality, release, architecture, testing, operations, PR review, ADR, and changelog guidance stay connected to security/privacy readiness

## Consequences

- Security/privacy readiness becomes a maintained foundation contract rather than scattered policy language.
- Future privacy, security, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc changes must update docs and checks intentionally.
- The check stays lightweight and complements `npm run security:supply-chain`, `npm run security:policy`, `npm run runtime:check`, `npm run pwa:check`, `npm run data:check`, CodeQL, Dependency Review, and human review instead of replacing them.
