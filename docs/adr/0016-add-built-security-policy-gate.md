# ADR 0016: Add Built Security Policy Gate

## Status

Accepted

## Context

NoteSense deploys as a static GitHub Pages app. The project already has dependency audit, CodeQL, runtime-surface, metadata, bundle, accessibility, browser, and deployment checks.

GitHub Pages does not give this app a normal server-side header configuration surface. Without an explicit browser policy in the built HTML, accidental future script, style, connection, worker, media, form, or embed changes would rely only on review and tests.

## Decision

Inject a production Content Security Policy meta tag during the Vite build through `vite.config.ts`.

Add `npm run security:policy` through `scripts/check-security-policy.mjs`. The check verifies that the Pages build:

- includes exactly one CSP meta tag
- carries the expected policy
- places the policy before the document title
- does not add inline script tags
- does not add inline styles
- does not add inline event handlers

Extend the Pages smoke test and live deployment verifier so the policy is checked in the deployment-shaped build and the public GitHub Pages deployment.

Include `npm run security:policy` in `npm run verify` after the Pages build and before metadata, runtime-surface, bundle, and Pages smoke checks.

## Consequences

- The production HTML shell has a repeatable browser security contract.
- Future network, analytics, sync, worker, media, third-party asset, or form behavior must update the policy intentionally.
- The policy is build-only so local Vite development keeps its normal websocket-based developer experience.
- Public deployment verification proves the same policy after Pages release.
