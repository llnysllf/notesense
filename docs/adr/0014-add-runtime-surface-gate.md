# ADR 0014: Add Runtime Surface Gate

## Status

Accepted

## Context

NoteSense now has explicit privacy documentation that says the app is local-first, has no analytics or telemetry, and does not require practice data to leave the browser. Those expectations are important now, and they become more important if future versions add sign-in, sync, analytics, or a backend.

Documentation alone does not prevent accidental drift. A static app can quietly add a client network call, third-party URL, beacon, cookie, websocket, or external script reference while still passing ordinary UI tests.

## Decision

Add `npm run runtime:check` through `scripts/check-runtime-surface.mjs`.

The check scans client-facing source files and the built Pages HTML after `npm run build:pages`.

It rejects:

- client `fetch`
- XHR
- telemetry beacons
- websockets
- event streams
- cookie access
- worker script imports
- unapproved absolute URLs
- built HTML references outside the `/notesense/` Pages base path

The allowlist is intentionally tiny:

- GitHub Pages canonical URL
- GitHub Pages sitemap URL
- XML sitemap namespace
- SVG namespace

Include `npm run runtime:check` in `npm run verify` after the Pages build and metadata check.

## Consequences

- The local-first runtime boundary becomes enforced in CI.
- Future network, auth, sync, analytics, telemetry, or third-party script work must be intentional and update this gate.
- The check is conservative; if the product later needs network behavior, that change should update privacy docs, architecture notes, release guidance, ADRs, and tests together.
