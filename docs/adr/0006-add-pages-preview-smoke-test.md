# ADR 0006: Add Pages Preview Smoke Test

## Status

Accepted

## Context

NoteSense deploys to GitHub Pages under `/notesense/`. The main Playwright suite verifies the app against a production preview server, and `npm run build:pages` verifies that built assets use the Pages base path. Those checks do not fully prove that the built app loads and starts correctly when served from the real `/notesense/` subpath.

## Decision

Add a dedicated Pages smoke test:

- `npm run test:e2e:pages` builds with `npm run build:pages`.
- Playwright serves the built app under `/notesense/` through the local Pages preview server on a separate port.
- The test navigates to `/notesense/`, verifies key UI, starts a drill, checks viewport containment, and fails on broken asset requests or browser errors.
- `npm run verify` runs the Pages smoke test after the Pages build and bundle budget check.

## Consequences

- The release gate now proves both app behavior and GitHub Pages routing shape.
- The Pages smoke test stays intentionally narrow so it does not duplicate the full browser workflow suite.
- The local preview server exists only to mirror the GitHub Pages subpath mount that generic root preview servers do not reproduce.
- Future deployment-base changes require an explicit test and documentation update.
