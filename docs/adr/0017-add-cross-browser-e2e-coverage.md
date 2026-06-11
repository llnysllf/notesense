# ADR 0017: Add Cross-Browser End-to-End Coverage

## Status

Accepted

## Context

The Playwright suite previously ran only on Chromium and a mobile Chromium profile. NoteSense ships to the open web through GitHub Pages, where a meaningful share of learners use Safari (WebKit) and Firefox (Gecko).

The product also depends on the Web Audio API for pitch playback and ear training. Web Audio behavior, autoplay/gesture policies, and SVG rendering historically differ most on WebKit. Testing a single engine left those differences unverified, which is exactly the kind of gap a production-grade, accessibility-focused app should close.

## Decision

Add Firefox and WebKit projects to `playwright.config.ts` so the main browser suite (`npm run test:e2e`) runs on:

- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- mobile Chromium (Pixel 5)

Install all three engines in CI with `npx playwright install --with-deps chromium firefox webkit`.

The Pages smoke and resilience suites stay on Chromium, because they verify deployment plumbing and an intentional render failure rather than per-engine product behavior.

## Consequences

- The practice loop, data import/export, storage-failure handling, responsive layout, and axe-core accessibility scans now run on all three major engines.
- WebKit coverage gives early warning of Safari-specific Web Audio or rendering regressions.
- CI installs and runs more browsers, so the quality gate takes longer; this is an accepted cost for cross-browser confidence.
- Future engine-specific failures must be fixed or explicitly scoped per project rather than silently ignored.
