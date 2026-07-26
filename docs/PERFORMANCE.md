# Performance Contract

NoteSense should feel instant enough for short practice sessions on desktop and mobile. This contract keeps the static Pages app lightweight, measurable, and reviewable as the foundation grows.

## Product Standard

- The practice loop should load quickly from GitHub Pages and remain responsive during note-reading and pitch-training rounds.
- Performance work should preserve accessibility, local-first privacy, offline/PWA behavior, and the supported browser surface.
- Bundle growth should be intentional, tied to learner value or maintainability value, and visible in review.
- Static metadata, service-worker, and Workbox assets count toward the shipped performance surface.

## Bundle Budgets

`npm run perf:budget` checks the Pages build output in `dist` after `npm run build:pages`.

Current per-file budgets:

- JavaScript asset: 264 KiB raw, 85 KiB gzip
- CSS asset: 34 KiB raw, 7 KiB gzip
- HTML shell: 4 KiB raw, 1 KiB gzip
- web metadata asset: 6 KiB raw, 3 KiB gzip
- service worker: 8 KiB raw, 4 KiB gzip
- Workbox runtime: 32 KiB raw, 12 KiB gzip

Current total budget:

- total Pages output: 375 KiB raw, 116 KiB gzip

Secondary statistics, song screens, and the evidence ledger are split from the initial practice route. The total raw budget includes those deferred chunks and PWA precache metadata; the 116 KiB gzip cap remains the shipped-network constraint. It was raised again when the Today screen added the daily-plan UI and its styles. It was raised from 105 KiB when URL-addressable destinations added a router (about 2 KiB gzip) and a 404.html shell copy so GitHub Pages can serve deep links.

## Lighthouse Signal

The Lighthouse workflow audits the Pages-shaped app at `http://127.0.0.1:4174/notesense/` with three runs.

Current Lighthouse thresholds:

- Performance: warn below 0.90
- Accessibility: fail below 0.95
- Best Practices: warn below 0.90
- SEO: warn below 0.90

Lighthouse warnings should be understood before merge, even when they are not release-blocking.

## Static Asset Boundaries

- `npm run metadata:check` verifies built HTML metadata, manifest, icon, robots, and sitemap after the Pages build.
- `npm run pwa:check` verifies the generated service worker imports the local Workbox runtime and precaches reviewed static assets only.
- `npm run runtime:check` verifies client source and built Pages output stay inside the local-first runtime boundary.
- `npm run test:e2e:pages` verifies the `/notesense/` deployment shape can load and start a drill.

## Change Rules

- Update this contract when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.
- Run `npm run performance:check` after performance-budget, Lighthouse, metadata, PWA, runtime-surface, Pages smoke, dependency, browser-support, or performance-doc changes.
- Run `npm run build:pages` before `npm run perf:budget`, `npm run metadata:check`, `npm run pwa:check`, and `npm run runtime:check`.
- Keep browser support, dependency maintenance, quality, release, architecture, testing, operations, and PR review guidance aligned when performance expectations change.

## Verification

`npm run performance:check` verifies that:

- this contract keeps product-standard, bundle-budget, Lighthouse, static-asset-boundary, change-rule, and verification sections
- bundle-budget categories, raw/gzip budgets, total budgets, and tracked static asset categories stay aligned with the checker
- Lighthouse runs, thresholds, workflow behavior, and artifact retention stay aligned
- metadata, PWA, runtime-surface, Pages smoke, README, contributing, quality, release, architecture, testing, browser support, ADR, changelog, and PR review guidance stay connected to performance
