# ADR 0035: Add Testing Contract Check

## Status

Accepted

## Context

NoteSense has a broad quality system: Vitest unit and component tests, coverage thresholds, Playwright browser workflows, resilience tests, Pages smoke tests, visual regression, Lighthouse, repository governance, policy-doc checks, and release verification.

The missing foundation is a single testing contract that explains which layer owns which risk and a lightweight check that keeps the documented matrix aligned with package scripts, Vitest coverage thresholds, Playwright configs, browser specs, and CI evidence.

Without that contract, future changes could add tests in the wrong layer, remove coverage silently, weaken browser determinism, or leave CI and release docs describing a test matrix that no longer exists.

## Decision

Add `docs/TESTING.md` and `npm run testing:check`, backed by `scripts/check-testing-contracts.mjs`. Include the check in `npm run check`.

The check verifies:

- testing docs keep ownership, routing, determinism, coverage, CI, review, and verification sections
- package scripts keep the expected testing commands available
- Vitest coverage thresholds remain per-file for core practice, storage, and shared data modules
- Playwright configs keep service workers blocked, traces retained on failure, and the expected browser projects
- browser specs keep coverage for accessibility, keyboard, import/export, storage failure, responsive layout, resilience, Pages, and visual-regression behavior
- CI continues to run `npm run verify` and upload browser failure artifacts only on failure

## Consequences

- Test ownership becomes explicit before the project grows more features.
- Future work has a clearer path for choosing unit, component, browser, visual, Pages, resilience, or contract checks.
- The check is source-based and lightweight; it complements, but does not replace, actually running the relevant test suites.
