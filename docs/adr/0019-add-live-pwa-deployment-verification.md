# ADR 0019: Add Live PWA Deployment Verification

## Status

Accepted

## Context

NoteSense already verifies generated PWA artifacts locally with `npm run pwa:check`. That proves the built service worker imports the local Workbox runtime, precaches reviewed static assets, and avoids background sync, push notifications, analytics, custom runtime API caching, and external URLs.

The live deployment verifier previously checked the public GitHub Pages URL, deployed HTML, metadata assets, built app assets, and security policy. After adding PWA support, that left a release-evidence gap: a release could pass live verification without proving that the public `sw.js` and Workbox runtime were deployed and still matched the static-asset-only policy.

## Decision

Extend `npm run deploy:verify-live` through `scripts/verify-live-pages.mjs` so the public deployment check also:

- fetches `/notesense/sw.js`
- verifies the service worker uses Workbox precaching
- verifies the service worker precaches the deployed app JavaScript and CSS
- verifies the service worker precaches the reviewed metadata assets
- rejects external URLs, background sync, push notifications, and external worker imports
- extracts the local Workbox runtime from the service worker
- fetches the deployed Workbox runtime and verifies it is JavaScript

Keep this as a post-deploy live check rather than a replacement for `npm run pwa:check`. The local check proves build output before release; the live check proves the published Pages artifact after release.

## Consequences

- Offline/PWA release evidence now covers both generated build artifacts and the public deployment.
- GitHub Pages or CDN publication drift for `sw.js` and Workbox files becomes visible after release.
- Future PWA changes must keep the local PWA checker, live verifier, privacy docs, CSP, release guide, and ADRs aligned.
- The live verifier remains conservative: it checks static app assets only and does not introduce runtime network, analytics, sync, or account behavior.
