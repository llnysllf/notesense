# ADR 0020: Add Visual Regression Gate

## Status

Accepted

## Context

NoteSense has browser workflow tests, axe-core accessibility checks, component tests, Lighthouse, and reproducible README screenshots. Those checks prove behavior and broad quality, but they do not protect the visual shape of the primary practice shells.

The product is intentionally small, so visual polish is part of its portfolio value. As the app grows toward sign-in, storage, richer practice modes, and a service-backed profile, small layout or theme regressions should be visible during review instead of discovered manually after release.

## Decision

Add a dedicated Playwright visual-regression suite through `playwright.visual.config.ts` and `e2e/visual.spec.ts`.

The initial protected states are:

- note-reading shell
- pitch-training shell
- desktop viewport
- mobile viewport
- light theme
- dark theme

Run the visual-regression workflow on macOS with Chromium so the committed screenshot baselines and remote check use the same platform family.

Keep visual regression outside `npm run verify` because the main release gate runs on Ubuntu and already owns functional, accessibility, security, bundle, PWA, metadata, and Pages smoke coverage. The dedicated `Visual Regression` workflow owns screenshot drift.

## Consequences

- Intentional UI changes must update and review screenshot baselines with `npm run test:e2e:visual:update`.
- Accidental layout, spacing, color, and theme drift becomes visible in pull requests and pushes.
- Visual regression complements, but does not replace, axe checks, keyboard checks, responsive layout assertions, Lighthouse, and human product judgment.
- Future design-system work can add more protected states without expanding the core workflow suite.
