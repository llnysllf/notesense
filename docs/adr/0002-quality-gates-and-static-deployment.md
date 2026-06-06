# ADR 0002: Enforce Quality Gates Before Static Deployment

## Status

Accepted

## Context

NoteSense is small, but it is intended to demonstrate professional product engineering. The app combines learning behavior, local persistence, audio, responsive UI, and accessibility-sensitive interactions. Small regressions can make practice unreliable or make the portfolio project feel unfinished.

## Decision

Use one local verification command and matching CI checks before shipping:

```bash
npm run verify
```

The gate includes:

- Formatting.
- ESLint with zero warnings.
- TypeScript checking.
- Unit tests for deterministic practice and analytics logic.
- Playwright browser tests for core workflows.
- Automated accessibility checks.
- GitHub Pages production build validation.
- GitHub Pages base-path smoke testing.

GitHub Actions must run the same quality expectations on pushes and pull requests, and Pages deployment must build from the checked-in source rather than committed build artifacts.

## Consequences

- Every release has repeatable evidence behind it.
- CI remains slower than a minimal smoke check, but the project stays safer as features grow.
- Browser failure artifacts should be uploaded when CI fails so failures are diagnosable.
- Contributors have one command to run before handing work to review.
