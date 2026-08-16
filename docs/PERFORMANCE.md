# Performance Contract

NoteSense should feel instant enough for short practice sessions on desktop and mobile. This contract keeps the static Pages app lightweight, measurable, and reviewable as the foundation grows.

## Product Standard

- The practice loop should load quickly from GitHub Pages and remain responsive during note-reading and pitch-training rounds.
- Performance work should preserve accessibility, local-first privacy, offline/PWA behavior, and the supported browser surface.
- Bundle growth should be intentional, tied to learner value or maintainability value, and visible in review.
- Static metadata, service-worker, and Workbox assets count toward the shipped performance surface.

## Bundle Budgets

`npm run perf:budget` checks the Pages build output in `dist` after `npm run build:pages`.

Current per-file budgets:

- JavaScript asset: 272 KiB raw, 85 KiB gzip
- CSS asset: 45 KiB raw, 10 KiB gzip
- HTML shell: 4 KiB raw, 1 KiB gzip
- prerendered public page: 4 KiB raw, 2 KiB gzip
- social card: 80 KiB raw, 80 KiB gzip
- web metadata asset: 6 KiB raw, 3 KiB gzip
- service worker: 8 KiB raw, 4 KiB gzip
- Workbox runtime: 32 KiB raw, 12 KiB gzip

Current total budget:

- total Pages output: 640 KiB raw, 240 KiB gzip

The total budget was raised to 520 KiB raw / 165 KiB gzip after the app reached 502.75 KiB raw / 159.05 KiB gzip. The JavaScript asset cap was raised to 272 KiB raw after the production entry chunk reached 269.06 KiB. Both changes preserve reviewable headroom for the next learner-facing slice while keeping every other individual asset cap in force. The CSS budget was raised by 1 KiB for the sound-world picker, which is a list of rows rather than a single control. The social card is budgeted on its own and left out of the total. No page requests it — only a crawler following `og:image` does — so counting a PNG that gzip cannot compress against the shipped-network cap would move that number without telling anyone anything about what a visit costs. Its own cap still bounds it, and `.png` is a tracked extension now so no image can ship unmeasured. The public site raised the total and CSS budgets: eight prerendered pages, the site's own layout, and the marketing contract. It also changed what a first visit costs — the practice app is now behind a lazy import, so someone who lands on a public page loads the page and nothing else, and the drills arrive only when they choose to practise. The total budget covers the whole deployed output; the practice route did not get bigger.

Sound worlds add no download: all four ship as voice definitions synthesized in the browser, so choosing one costs bytes only in the manifest. `SOUND_CACHE_BUDGET_BYTES` in `shared/src/sound/cachePolicy.ts` caps any future downloaded packs at 24 MB total, held apart from this bundle budget because it is device storage rather than shipped bytes; the policy refuses a pack larger than the whole budget up front and evicts least-recently-used packs rather than the one being practised with.
Secondary statistics, song screens, the evidence ledger, and the lazy rhythm, assessment, ear, singing, and import workspaces are split from the initial practice route. The total raw budget includes those deferred chunks and PWA precache metadata; the 160 KiB gzip cap remains the shipped-network constraint. It was raised for MIDI import: a bounded parser, the mapping into the song model, and the import screen, behind a lazily loaded route. It was previously raised for singing: pitch detection, the sung-score model, and the singing workspace, all behind a lazily loaded route so nothing that does not sing pays for it. It was previously raised for ear training: nine exercise families, alignment-based comparison, and the transcription editor, all behind a lazily loaded workspace so the practice route does not pay for them. It was previously raised for placement and the Reading Score: generated assessment passages, component scoring, a passage staff, and the locally drawn share card, none of which load on the practice route. It was previously raised for the rhythm engine's timing, grading, and accessible feedback surface. It was previously raised when the Today screen added the daily-plan UI and its styles, and from 105 KiB when URL-addressable destinations added a router (about 2 KiB gzip) and a 404.html shell copy so GitHub Pages can serve deep links.

## Lighthouse Signal

The Lighthouse workflow audits the Pages-shaped app at `http://127.0.0.1:4174/notesense/` with three runs.

Current Lighthouse thresholds:

- Performance: warn below 0.90
- Accessibility: fail below 0.95
- Best Practices: warn below 0.90
- SEO: warn below 0.90

Lighthouse warnings should be understood before merge, even when they are not release-blocking.

## Static Asset Boundaries

- `npm run metadata:check` verifies built HTML metadata, manifest, icon, robots, and sitemap after the Pages build.
- `npm run pwa:check` verifies the generated service worker imports the local Workbox runtime and precaches reviewed static assets only.
- `npm run runtime:check` verifies client source and built Pages output stay inside the local-first runtime boundary.
- `npm run test:e2e:pages` verifies the `/notesense/` deployment shape can load and start a drill.

## Change Rules

- Update this contract when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.
- Run `npm run performance:check` after performance-budget, Lighthouse, metadata, PWA, runtime-surface, Pages smoke, dependency, browser-support, or performance-doc changes.
- Run `npm run build:pages` before `npm run perf:budget`, `npm run metadata:check`, `npm run pwa:check`, and `npm run runtime:check`.
- Keep browser support, dependency maintenance, quality, release, architecture, testing, operations, and PR review guidance aligned when performance expectations change.

## Verification

`npm run performance:check` verifies that:

- this contract keeps product-standard, bundle-budget, Lighthouse, static-asset-boundary, change-rule, and verification sections
- bundle-budget categories, raw/gzip budgets, total budgets, and tracked static asset categories stay aligned with the checker
- Lighthouse runs, thresholds, workflow behavior, and artifact retention stay aligned
- metadata, PWA, runtime-surface, Pages smoke, README, contributing, quality, release, architecture, testing, browser support, ADR, changelog, and PR review guidance stay connected to performance
