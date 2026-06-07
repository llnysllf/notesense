# ADR 0010: Add Core Coverage Gate

## Status

Accepted

## Context

NoteSense has unit tests for deterministic practice logic and browser tests for real user workflows. The unit tests run in CI, but there is no measured coverage threshold. That leaves room for future refactors to remove important practice-engine or storage coverage while the test command still passes.

Line coverage is less useful for React component behavior that is already covered through Playwright, but it is valuable for framework-independent data and practice logic.

## Decision

Add a Vitest V8 coverage gate for the core modules:

- `src/practiceEngine.ts`
- `src/storage.ts`

Add `npm run test:coverage` and include it in `npm run check`.

Configure thresholds in `vite.config.ts`:

- 85% statements
- 80% branches
- 90% functions
- 85% lines

Generated coverage output is ignored by Git.

## Consequences

- CI now rejects changes that hollow out core logic coverage.
- Coverage remains targeted at deterministic modules where the metric is meaningful.
- Browser accessibility and workflow confidence remain covered by Playwright and axe-core.
- Future increases to the threshold should be made deliberately as the core test suite grows.
