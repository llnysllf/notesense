# ADR 0004: Add Security Scanning Gates

## Status

Accepted

## Context

NoteSense is a static local-first app today, but it still depends on npm packages, GitHub Actions, browser APIs, import/export parsing, and future cloud-ready boundaries. A professional project should make security checks repeatable instead of relying on ad hoc manual review.

## Decision

Add two security gates:

- `npm run security:audit` runs `npm audit --audit-level=high` against the package lockfile and is included in `npm run verify`.
- GitHub Actions runs CodeQL advanced setup for `javascript-typescript` on pushes, pull requests, and a weekly schedule.

CodeQL uses the `security-extended` query suite so security scanning covers more than the default baseline while the project remains small.

## Consequences

- High and critical npm advisories block local release verification and CI.
- Static code scanning runs independently from the browser test pipeline.
- Security scanning adds another remote check before changes are considered healthy.
- Future backend, auth, sync, import/export, and service-boundary changes have a stronger baseline to build on.
