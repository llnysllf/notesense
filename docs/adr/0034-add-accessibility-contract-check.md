# ADR 0034: Add Accessibility Contract Check

## Status

Accepted

## Context

NoteSense already has meaningful accessibility work: native controls, keyboard answers, visible focus styles, ARIA state, labeled SVGs, axe-core browser checks, jsx-a11y lint rules, cross-browser Playwright coverage, a resilience test for the recovery screen, Lighthouse scoring, and visual-regression baselines.

The missing control is an explicit accessibility contract that ties those pieces together. Without it, a future UI change could preserve passing tests while quietly dropping keyboard reachability, screen reader labels, focus visibility, reduced-motion expectations, or release-review language.

## Decision

Add `docs/ACCESSIBILITY.md` and `npm run accessibility:check`, backed by `scripts/check-accessibility-contracts.mjs`. Include the check in `npm run check`.

The check verifies:

- the accessibility contract keeps keyboard, focus, screen reader, visual, motion, automated coverage, manual review, and change-rule sections
- jsx-a11y linting remains configured
- Playwright keeps axe, keyboard, selected-state, responsive, recovery-screen, cross-browser, and mobile coverage
- source files keep the expected ARIA, live-region, SVG, meter, and focus affordances
- README, quality, release, architecture, design-system, PR, and contribution docs keep accessibility review visible

## Consequences

- Accessibility becomes a maintained product contract, not scattered good intent.
- UI and workflow changes must update docs and checks when they alter keyboard behavior, screen reader semantics, focus visibility, contrast, motion, or automated coverage.
- The check stays lightweight and source-based; manual assistive-technology review is still required for meaningful UI changes.
