# ADR 0041: Add Performance Contract

## Status

Accepted

## Context

NoteSense already has a bundle budget checker, Lighthouse workflow, web metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke tests, live deployment verification, and release guidance. Those controls protect performance-related behavior, but the product performance standard was spread across several docs and scripts.

As the foundation grows, performance can drift through dependency updates, new static assets, service-worker changes, metadata changes, Pages build changes, or Lighthouse threshold changes even when the visible product surface does not expand.

## Decision

Add `docs/PERFORMANCE.md` and `npm run performance:check`, backed by `scripts/check-performance-contract.mjs`. Include the check in `npm run check`.

The check verifies:

- bundle-budget categories, raw/gzip budgets, total budgets, and tracked static asset categories
- Lighthouse runs, thresholds, workflow behavior, and artifact retention
- metadata, PWA, runtime-surface, and Pages smoke evidence
- README, contributing, quality, release, architecture, testing, browser support, ADR, changelog, and PR review guidance stay connected to performance

## Consequences

- Performance becomes a maintained product contract rather than separate budget and Lighthouse settings.
- Future bundle, Lighthouse, metadata, PWA, runtime-surface, Pages smoke, dependency, or browser-support changes must update docs and checks intentionally.
- The check remains lightweight and text-based; it complements bundle-budget checks, Lighthouse, metadata checks, PWA checks, runtime-surface checks, and browser tests instead of replacing them.
