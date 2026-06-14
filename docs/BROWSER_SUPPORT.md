# Browser Support Contract

NoteSense is a browser-based practice tool, so the supported surface must stay explicit as the app grows. This contract defines the browser engines, device shapes, runtime APIs, and verification evidence that protect the current local-first product.

## Supported Surface

- Evergreen desktop Chromium, Firefox, and WebKit/Safari-engine browsers are covered by the main Playwright workflow.
- Mobile Chromium viewport behavior is covered by the main Playwright workflow.
- GitHub Pages deployment is supported at the `/notesense/` base path.
- The app supports light and dark color schemes through system preference.
- Offline/PWA behavior is supported after the first successful load through the generated static service worker.

## Runtime Assumptions

- JavaScript must be enabled.
- Web Audio API support is required for pitch playback.
- LocalStorage support is required for durable saved progress and settings.
- SVG support is required for staff notation and practice insight charts.
- CSS custom properties, `prefers-color-scheme`, and `prefers-reduced-motion` support are part of the UI baseline.
- Storage failures should not crash the practice loop; the app should surface non-blocking save-status messaging.

## Unsupported Surface

- Legacy browsers, Internet Explorer, and JavaScript-disabled sessions are not supported.
- Browsers that block LocalStorage can still load the app, but saved progress is not guaranteed.
- Direct database access, third-party scripts, telemetry beacons, cookies, websockets, and external network APIs are not part of the current browser support contract.
- Custom service-worker runtime API caching, background sync, push notifications, and practice-data service-worker storage are not supported.

## Verification Evidence

- `npm run test:e2e` verifies Chromium, Firefox, WebKit, and mobile Chromium practice workflows, keyboard answers, import/export, storage failure handling, responsive layout, and axe coverage.
- `npm run test:e2e:pages` verifies the Pages-shaped build at `/notesense/` on desktop and mobile Chromium.
- `npm run test:e2e:visual` verifies protected note-reading and pitch-training shells across desktop/mobile and light/dark Chromium.
- `npm run pwa:check` verifies generated service-worker static precache behavior.
- `npm run runtime:check` verifies client source and built Pages output stay inside the local-first runtime boundary.
- The Lighthouse workflow verifies deployment-shaped performance, accessibility, best-practice, SEO, and PWA signals.

## Change Rules

- Update this contract when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.
- Run `npm run browsers:check` after browser-support, Playwright project, Pages smoke, visual-regression, PWA, runtime-surface, Lighthouse, or browser-support documentation changes.
- Run the relevant browser suite when behavior changes: `npm run test:e2e`, `npm run test:e2e:pages`, `npm run test:e2e:visual`, or `npm run pwa:check`.
- Keep accessibility, testing, quality, release, architecture, operations, privacy, and PR review guidance aligned when browser support changes.

## Verification

`npm run browsers:check` verifies that:

- this contract keeps supported-surface, runtime-assumption, unsupported-surface, verification-evidence, change-rule, and verification sections
- Playwright configs keep the reviewed browser engines, mobile profiles, Pages base path, visual-regression profiles, service-worker blocking, and trace policy
- browser specs continue to cover accessibility, keyboard, import/export, storage failures, responsive layout, Pages base path, and visual-regression shells
- README, contributing, accessibility, testing, quality, release, architecture, operations, privacy, ADR, changelog, and PR review guidance stay connected to browser support
