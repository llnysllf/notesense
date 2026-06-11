# ADR 0021: Add Threat Model And Backend Readiness Docs

## Status

Accepted

## Context

NoteSense is intentionally local-first today, but the product direction includes future sign-in, cloud sync, managed storage, and possibly PostgreSQL or AWS services. Adding those pieces without a security and data-boundary plan would make the project feel larger while making it less professional.

The current app already has privacy docs, CSP checks, runtime-surface checks, import/export normalization, dependency scanning, CodeQL, and release guidance. The missing foundation is a clear pre-backend contract: what data exists, which trust boundaries matter, why the browser must not connect directly to a database, and what must be designed before account data leaves the browser.

## Decision

Add:

- `docs/THREAT_MODEL.md` for current and future security boundaries, data classification, trust boundaries, current controls, future auth/sync risks, and backend launch requirements
- `docs/BACKEND_READINESS.md` for the future service shape, API boundary, candidate data model, PostgreSQL guidance, sync strategy, secrets rules, observability requirements, and backend launch checklist

Update policy docs and the docs gate so these files remain part of the required governance surface.

## Consequences

- Future sign-in, sync, API, PostgreSQL, and AWS work must update security and backend planning before implementation.
- PostgreSQL is treated as a future backend-owned persistence choice, not as something the React app connects to directly.
- The local-first product remains usable while backend design matures.
- Reviewers have a concrete checklist for deciding when account and cloud work is ready to build.
