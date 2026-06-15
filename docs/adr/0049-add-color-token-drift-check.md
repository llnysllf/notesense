# ADR 0049: Add Color Token Drift Check

## Status

Accepted

## Context

NoteSense already has a tokenized stylesheet and visual-regression coverage, but the design-system gate only checked that important tokens and selectors existed. Future UI work could still add raw hex, RGB, or HSL color values directly inside component selectors, creating one-off theme behavior that is harder to review across light and dark modes.

This risk grows as the app adds more states, charts, settings, and account-ready surfaces. A small color-token drift check keeps visual polish tied to the design system instead of reviewer memory.

## Decision

Extend `npm run design:check` so `scripts/check-design-system.mjs` rejects hard-coded hex, RGB, RGBA, HSL, or HSLA theme colors outside `:root` token definitions.

Component selectors should consume existing CSS custom properties or introduce new semantic tokens in the light and dark theme blocks before using a new color. The current focus and strong mastery border tints are promoted to semantic border tokens.

## Consequences

- Future UI changes must keep theme colors centralized and reviewable.
- Light and dark mode behavior stays easier to audit because color decisions live in token definitions.
- The check remains intentionally lightweight. It catches theme-color drift without introducing a larger design-token build system before the project needs one.
