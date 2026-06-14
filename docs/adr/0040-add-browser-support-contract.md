# ADR 0040: Add Browser Support Contract

## Status

Accepted

## Context

NoteSense already runs browser workflow tests across Chromium, Firefox, WebKit, and mobile Chromium. It also has Pages smoke tests, visual regression checks, PWA artifact checks, runtime-surface checks, Lighthouse, accessibility checks, and release guidance.

Those checks prove important behavior, but the supported browser surface was implicit. Future changes could alter Playwright projects, device profiles, Pages base-path coverage, PWA assumptions, Web Audio behavior, LocalStorage behavior, or responsive support without updating the product promise.

## Decision

Add `docs/BROWSER_SUPPORT.md` and `npm run browsers:check`, backed by `scripts/check-browser-support.mjs`. Include the check in `npm run check`.

The check verifies:

- supported browser engines and mobile viewport coverage
- Playwright browser projects, Pages smoke projects, visual-regression profiles, service-worker blocking, and trace policy
- browser specs for accessibility, keyboard, import/export, storage failures, responsive layout, Pages base path, and visual-regression shells
- README, contributing, accessibility, testing, quality, release, architecture, operations, privacy, ADR, changelog, and PR review guidance stay connected to browser support

## Consequences

- Browser support becomes a maintained product contract rather than an assumption hidden inside Playwright configs.
- Future browser, device, PWA, runtime-surface, or deployment-base changes must update docs and checks intentionally.
- The check remains lightweight and text-based; it complements browser tests, visual regression, Lighthouse, PWA checks, and runtime-surface checks instead of replacing them.
