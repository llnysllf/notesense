# ADR 0013: Add Policy Docs Gate

## Status

Accepted

## Context

NoteSense is local-first today, but the roadmap includes possible sign-in, cloud sync, backend APIs, and managed storage. The project already documents architecture, release, security, and quality expectations. Privacy and data-handling expectations were implied across those documents rather than captured in one explicit policy.

As the app grows, data-handling drift should be caught before code reaches production.

## Decision

Add `docs/PRIVACY.md` to document the current data boundary:

- Browser LocalStorage keys.
- Import/export behavior.
- No analytics, telemetry, advertising pixels, or third-party tracking scripts.
- Web Audio behavior.
- Future auth, sync, backend, and hosted storage expectations.

Add `npm run docs:check` through `scripts/check-policy-docs.mjs`. The check verifies that core policy and governance documents exist and include the expected privacy, security, release, contribution, and review language.

Include `npm run docs:check` in `npm run check`, so CI rejects changes that remove or disconnect these commitments.

## Consequences

- Privacy and data-handling expectations become explicit release evidence.
- Future account, analytics, network, sync, or storage work must update the policy docs intentionally.
- The check is intentionally lightweight and text-based so it stays easy to maintain while the app is small.
