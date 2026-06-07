# ADR 0012: Add Web Metadata Contract

## Status

Accepted

## Context

NoteSense is a static GitHub Pages app. The codebase already verifies app behavior, accessibility, bundle size, deployment base path, security, dependency licenses, runtime resilience, and live deployment health.

The shipped HTML shell still had only the minimal title and description. A professional static product should also carry stable install, share, crawler, and brand identity metadata.

## Decision

Add static web identity assets under `public`:

- `icon.svg`
- `site.webmanifest`
- `robots.txt`
- `sitemap.xml`

Add HTML shell metadata:

- canonical URL
- favicon
- manifest link
- theme color
- color scheme
- Open Graph summary tags
- Twitter summary tags

Add `npm run metadata:check` through `scripts/check-web-metadata.mjs`. The script verifies the built Pages output after `npm run build:pages`, and `npm run verify` now runs the metadata check before the bundle budget and Pages smoke test.

Extend the Pages smoke test and live deployment verifier so metadata assets are checked under the `/notesense/` base path.

## Consequences

- The app has a stronger static product identity without changing learner-facing practice behavior.
- Metadata drift fails locally and in CI.
- Future hosting or domain changes must update the metadata contract and live verifier together.
- Static metadata assets are included in the bundle budget.
