# ADR 0018: Add Offline PWA And Lighthouse Gate

## Status

Accepted

## Context

NoteSense is a small practice app that should feel instant and reliable. It is also a portfolio project, so the deployed product should show professional care around installability, offline behavior, and objective web-quality evidence.

The project already has Playwright, accessibility, bundle, metadata, runtime-surface, CSP, and live-deployment checks. Those checks prove core behavior, but they do not score the deployment-shaped app the way Lighthouse does, and they do not prove the app has an installable/offline path.

## Decision

Use `vite-plugin-pwa` to generate a production service worker that precaches the reviewed static Pages build output.

Add `npm run pwa:check` through `scripts/check-pwa-artifacts.mjs` to verify that the generated service worker:

- imports only the local Workbox runtime
- precaches the reviewed static Pages assets
- avoids external URLs
- avoids background sync
- avoids push notifications

Keep the PWA scope conservative:

- no custom runtime caching routes
- no analytics
- no background sync
- no push notifications
- no practice-data sync
- no service-worker behavior in local Vite dev

Allow the Content Security Policy to load self-hosted workers with `worker-src 'self'`.

Add a `Lighthouse` GitHub Actions workflow that:

- builds the GitHub Pages output
- serves it through `scripts/serve-pages-preview.mjs` at `/notesense/`
- runs Lighthouse CI from `.lighthouserc.json`
- treats accessibility as release-blocking
- treats performance, best-practice, and SEO scores as visible warnings
- uploads Lighthouse artifacts for review

## Consequences

- The app becomes installable and usable offline after the first successful load.
- Offline behavior remains static-asset-only until account sync is deliberately designed.
- Lighthouse score drift becomes visible in pull requests and pushes.
- PWA artifact drift becomes visible in local verification and CI.
- The service worker and Workbox runtime count toward the bundle budget.
- Future network, sync, push, background task, or third-party asset behavior must update privacy docs, CSP, runtime-surface checks, release guidance, and ADRs together.
