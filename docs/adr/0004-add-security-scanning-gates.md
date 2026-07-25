# ADR 0004: Add Security Scanning Gates

## Status

Accepted

## Context

NoteSense is a static local-first app today, but it still depends on npm packages, GitHub Actions, browser APIs, import/export parsing, and future cloud-ready boundaries. A professional project should make security checks repeatable instead of relying on ad hoc manual review.

## Decision

Add two security gates:

- `npm run security:audit` evaluates `npm audit --audit-level=high --json` against the package lockfile and is included
  in `npm run verify`. A high or critical finding may be accepted temporarily only when a repository policy names
  the exact package and advisory, verifies every affected node is development-only, records a reason, and sets an
  expiry date.
- GitHub Actions runs CodeQL advanced setup for `javascript-typescript` on pushes, pull requests, and a weekly schedule.

CodeQL uses the `security-extended` query suite so security scanning covers more than the default baseline while the project remains small.

## Consequences

- High and critical npm advisories block local release verification and CI unless they satisfy an active,
  machine-verified development-only exception.
- Audit exceptions expire automatically and require a new security review to extend.
- Static code scanning runs independently from the browser test pipeline.
- Security scanning adds another remote check before changes are considered healthy.
- Future backend, auth, sync, import/export, and service-boundary changes have a stronger baseline to build on.
