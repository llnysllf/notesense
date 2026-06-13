# ADR 0029: Add Design System Contract

## Status

Accepted

## Context

NoteSense now has protected visual-regression screenshots, responsive UI polish, accessibility checks, and a tokenized stylesheet. The remaining risk is design drift: future UI changes could add one-off colors, states, or layouts without preserving the calm practice-focused interface.

A big-company-quality project should make durable UI decisions explicit and checkable, even when the design system is small.

## Decision

Add `docs/DESIGN_SYSTEM.md` as the design-system contract and add `npm run design:check`, backed by `scripts/check-design-system.mjs`.

The design check verifies:

- the design-system document keeps product posture, token, component-state, accessibility, protected-visual-surface, and change-process sections
- `src/styles.css` keeps the expected token groups, theme boundary, focus behavior, reduced-motion behavior, responsive breakpoints, and primary component states
- visual-regression tests continue to protect note-reading and pitch-training shells
- committed visual baselines continue to cover desktop/mobile and light/dark variants

Include `npm run design:check` in `npm run check` so design-system drift is visible before CI review.

## Consequences

- UI polish becomes a maintained system instead of an informal stylesheet convention.
- Future design changes must update docs, tokens, component states, or visual baselines intentionally.
- The check is deliberately lightweight; it protects the current product shell without introducing Storybook or a larger design-system toolchain before the app needs one.
