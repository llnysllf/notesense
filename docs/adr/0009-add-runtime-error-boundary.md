# ADR 0009: Add Runtime Error Boundary

## Status

Accepted

## Context

NoteSense has strong build, unit, browser, accessibility, deployment, security, license, and performance gates. Those checks reduce the chance of shipping a broken app, but they do not help a learner if an unexpected React render failure still reaches production.

Without an app-level error boundary, a render-time exception can leave the product as a blank page.

## Decision

Add an app-level React error boundary around `App`.

The boundary renders an accessible recovery screen with a reload action if a child render fails. It logs the failure to the browser console for development and future client-side error reporting.

Add a dedicated Playwright resilience suite:

- `npm run test:e2e:resilience` runs `e2e/error-boundary.spec.ts`.
- The resilience config builds with Vite mode `resilience`.
- That mode enables a hidden test hook that intentionally throws before the app mounts.
- The normal browser suite continues to fail on unexpected console and page errors.

## Consequences

- Runtime failure recovery becomes a tested product contract.
- Intentional crash testing stays isolated from ordinary workflow tests.
- `npm run verify` now includes the resilience suite before the Pages release build.
- Future client-side error reporting can attach to the same boundary without changing learner-facing features.
