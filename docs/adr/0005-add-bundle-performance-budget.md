# ADR 0005: Add Bundle Performance Budget

## Status

Accepted

## Context

NoteSense is meant to feel fast and focused. The app is deployed as a static GitHub Pages site and should stay lightweight enough for quick practice sessions on desktop and mobile. As the project grows, bundle size can drift upward even when the product surface does not visibly change.

## Decision

Add a bundle budget gate to the release verification path:

- `npm run perf:budget` checks the GitHub Pages build output in `dist`.
- The check measures raw and gzip sizes for JavaScript, CSS, and HTML.
- `npm run verify` runs the budget after `npm run build:pages`.

Current budgets:

- JavaScript asset: 260 KiB raw, 85 KiB gzip.
- CSS asset: 24 KiB raw, 5 KiB gzip.
- HTML shell: 2 KiB raw, 1 KiB gzip.
- Total tracked output: 300 KiB raw, 96 KiB gzip.

## Consequences

- Performance regressions become visible in local verification and CI.
- Intentional bundle growth requires an explicit budget change and review.
- The project keeps a lightweight deployment profile while future features are added.
- The budget is simple and dependency-free, so it can run anywhere the existing Node runtime runs.
