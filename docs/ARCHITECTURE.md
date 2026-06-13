# NoteSense Architecture

NoteSense is currently a local-first React application. The product goal is to keep the practice loop fast and polished while preserving clean seams for future sign-in, cloud storage, sync, and managed web services.

## Current Shape

- `src/practiceEngine.ts` owns scoring, adaptive weighting, daily goals, session summaries, trend summaries, mastery states, practice-plan recommendations, and analytics helpers. It is pure TypeScript and does not depend on React or browser storage.
- `src/noteData.ts` owns structured note ranges for treble reading, bass reading, and pitch training.
- `src/storage.ts` owns persistence, normalization, migration from the original local progress shape, and versioned data import/export.
- `shared/src` owns framework-agnostic practice data normalization, import/export, and merge contracts that can be reused by a future sync backend.
- `src/audio.ts` owns browser audio playback.
- `src/hooks` contains focused React state orchestration for settings, progress, session flow, and data portability.
- `src/components` contains focused UI sections for the staff, pitch prompt, stats panel, session history, practice insights, and stat tiles.
- `src/components/ErrorBoundary.tsx` owns the app-level recovery surface for unexpected render failures.
- `src/App.tsx` coordinates product state, round flow, settings, storage calls, and component composition.
- `public` contains static web identity assets: favicon, web manifest, robots file, and sitemap.
- `e2e/app.spec.ts` covers the browser practice loop, accessibility, layout health, insight chart rendering, import/export behavior, and storage failure messaging.
- `e2e/error-boundary.spec.ts` covers intentional render-failure recovery through a dedicated resilience Playwright config.
- `e2e/pages-smoke.spec.ts` covers the GitHub Pages build at the `/notesense/` base path.
- `e2e/visual.spec.ts` covers visual regression for the note-reading and pitch-training shells across desktop/mobile and light/dark themes.
- Playwright workflow configs block service workers so UI behavior tests are not coupled to cache lifecycle timing; PWA correctness is verified by generated-artifact and live-deployment checks.
- `.github/workflows` owns the CI, CodeQL, Dependency Review, and Pages deployment gates.
- `.github/workflows/visual-regression.yml` owns the macOS Chromium visual-regression gate so screenshot baselines use the same platform family as the committed snapshots.
- `.github/workflows/lighthouse.yml` owns Lighthouse scoring for the deployment-shaped Pages build.
- `docs/adr` records architecture decisions that should survive beyond a single implementation pass.
- `docs/DESIGN_SYSTEM.md` documents the design-token, component-state, accessibility, and visual-regression contract for UI changes.
- `docs/THREAT_MODEL.md` documents current and future security boundaries before account or sync work begins.
- `docs/BACKEND_READINESS.md` documents the service, API, data-model, sync, and PostgreSQL path for future backend work.
- `.nvmrc`, package engines, and `.npmrc` define the shared Node/npm runtime for local development, CI, deployment, and dependency maintenance.
- `vite.config.ts` injects the production Content Security Policy meta tag during build.
- `vite.config.ts` also owns PWA service worker generation and Vitest browser-like component-test setup.
- `scripts/check-repository-hygiene.mjs` owns required root configuration, ignore-policy, runtime-policy, and tracked-artifact hygiene checks.
- `scripts/check-design-system.mjs` owns the lightweight design-system contract for CSS tokens, shell states, accessibility affordances, responsive guards, and visual-regression coverage.
- `scripts/check-licenses.mjs` owns dependency license policy enforcement.
- `scripts/check-security-policy.mjs` owns built HTML security policy verification.
- `scripts/check-policy-docs.mjs` owns policy document presence and alignment checks.
- `scripts/check-doc-integrity.mjs` owns local Markdown link, anchor, and documented npm script reference checks.
- `scripts/check-pwa-artifacts.mjs` owns generated service worker and static precache verification.
- `scripts/check-runtime-surface.mjs` owns client runtime/network surface checks against the local-first privacy boundary.
- `scripts/check-bundle-budget.mjs` owns the static Pages bundle budget.
- `scripts/check-web-metadata.mjs` owns built HTML, manifest, icon, robots, and sitemap verification.
- `scripts/serve-pages-preview.mjs` serves `dist` under `/notesense/` for deployment-shape smoke tests.
- `scripts/verify-live-pages.mjs` owns post-deploy public GitHub Pages, metadata asset, service worker, Workbox runtime, and security policy verification.
- `vite.config.ts` owns Vitest configuration, including coverage thresholds for the framework-independent core modules.
- `tsconfig.json` and `tsconfig.node.json` own the strict TypeScript contract for app code and project tooling.
- `docs/PRIVACY.md` documents the current local-first privacy and data-handling boundary.
- `scripts/check-workflow-actions.mjs` owns GitHub Actions reference pinning policy enforcement.
- `scripts/check-workflow-permissions.mjs` owns GitHub Actions token-permission policy enforcement.
- `scripts/check-workflow-operations.mjs` owns GitHub Actions concurrency, timeout, and artifact-retention policy enforcement.
- `scripts/check-github-repository.mjs` owns GitHub repository governance drift detection for branch protection, required checks, security settings, Pages, vulnerability alerts, and active workflows.

## Quality Bar

Every feature should keep these expectations intact:

- Practice logic remains testable outside React.
- New note ranges should be added as data first, then wired through tested selection and settings paths.
- Product analytics and chart inputs are derived in pure functions before rendering.
- Habit analytics are derived from completed sessions so future sync can reconcile daily goals from server history.
- Mastery state remains range-aware so treble, bass, pitch, and future expanded ranges do not leak progress into each other.
- Coaching recommendations stay derived and deterministic until there is a service layer that can own personalization.
- Persistence changes go through a storage boundary instead of being scattered through UI components.
- Cross-device or sync-ready data-shape changes should happen in `shared/src` before UI or backend adapters consume them.
- Privacy expectations must stay aligned with local storage, import/export, future auth, sync, analytics, and network behavior.
- Client runtime surface checks should reject network, tracking, cookie, websocket, or external URL drift unless the change is intentional and documented.
- User-visible state has a failure path, especially for save, export, auth, and sync operations.
- Unexpected render failures should show the app-level recovery screen instead of leaving a blank product surface.
- Accessibility is part of the feature definition, not a final cleanup step.
- Design-system changes should preserve the documented token layers, component states, responsive behavior, focus behavior, and protected visual surfaces.
- Dependency license compliance is part of supply-chain readiness.
- Dependency Review is part of pull-request supply-chain readiness for dependency and lockfile changes.
- Workflow action pinning and least-privilege token permissions are part of supply-chain readiness; action refs should use full commit SHAs with source-version comments.
- Repository governance checks are part of operational readiness when GitHub settings, branch protection, required checks, Pages, or workflow activation changes.
- Security scanning is part of release readiness, especially for dependency, import/export, auth, sync, and backend-boundary changes.
- The production HTML shell should carry a verified Content Security Policy before release.
- Performance budgets are part of release readiness so the practice app stays fast as scope grows.
- Lighthouse scores are part of release readiness for user-visible performance, accessibility, best-practice, SEO, and PWA drift.
- Visual-regression baselines are part of review readiness for protected shell states, especially across desktop/mobile and light/dark themes.
- Web identity metadata is part of release readiness because static apps still need install, share, and crawler signals.
- Live deployment verification should prove deployed HTML, metadata assets, static app assets, the generated service worker, and the local Workbox runtime after release.
- Deployment base-path smoke coverage is part of release readiness because GitHub Pages serves the app from `/notesense/`.
- The full `npm run check` gate must pass before a change is considered ready.
- The full `npm run verify` release gate must pass before a change is shipped.
- Core unit coverage thresholds should protect the practice engine and storage contracts without pretending to replace browser workflow tests.
- Component tests should cover reusable UI states that are awkward to exercise through full browser workflows.
- TypeScript strictness should make optional values, array access, overrides, and unused code explicit.
- Runtime resilience coverage should stay in its own browser config so intentional crash testing does not weaken strict console/page-error checks.
- The GitHub Pages build must be verified with the `/notesense/` base path before deployment.
- Runtime upgrades should be intentional engineering changes, not incidental workflow edits.
- Pull requests should use the quality checklist in [docs/QUALITY.md](QUALITY.md).

## Local-First Data Model

The app saves progress and settings in browser LocalStorage today. This keeps version 1 useful without accounts or infrastructure, and it gives us a simple offline baseline. Exported data includes:

- `schemaVersion`
- `exportedAt`
- `progress`
- `settings`, including selected reading range

That import/export schema is the first contract for future account migration. When sign-in arrives, imported local data can be uploaded to a user profile without relying on fragile DOM or browser-state scraping.

## Future Cloud-Ready Path

The likely service-backed version should introduce these pieces in order:

1. Authentication: add email, passkey, or OAuth sign-in with a provider such as Cognito, Auth0, Clerk, or Supabase Auth.
2. API boundary: create a small backend service for profile, practice session, settings, and sync endpoints.
3. Managed persistence: store user profiles, settings, and practice sessions in a database such as Postgres or DynamoDB.
4. Sync model: keep local progress as the fast source during practice, then sync completed sessions and settings after each round.
5. Migration: use the versioned local data import path for anonymous users who later create an account.
6. Observability: add structured server logs, request tracing, and client-side error reporting.
7. Release safety: use feature flags or staged rollout for account and sync features.

An AWS version could use Cognito, API Gateway, Lambda, DynamoDB or RDS, S3, CloudFront, and CloudWatch. That choice should happen when the backend feature set is clearer, not before the local product proves the learning loop.

PostgreSQL should sit behind a backend API, never behind direct browser access. It becomes useful when NoteSense needs accounts, cross-device sync, relational practice analytics, data export/deletion workflows, and operational backups.

## Boundaries To Preserve

- Keep `practiceEngine` framework-independent.
- Keep browser storage behind adapter-style functions.
- Keep shared import/export and merge logic framework-agnostic so future backend sync can reuse it.
- Keep export/import schemas versioned.
- Keep privacy documentation updated when data fields, storage keys, export content, tracking behavior, network calls, auth, or sync changes.
- Keep the runtime-surface gate updated with any intentional external URLs, network APIs, auth, analytics, telemetry, or sync behavior.
- Keep coverage thresholds focused on deterministic core modules where line coverage is meaningful.
- Keep TypeScript hardening flags enabled as the app grows toward service-backed data.
- Keep network calls outside the core practice engine.
- Keep UI components focused on one product responsibility.
- Keep UI styling aligned with `docs/DESIGN_SYSTEM.md`; new durable visual patterns should update the design-system contract and its checker.
- Keep browser tests tied to real user workflows rather than implementation details.
- Keep component tests focused on accessibility labels, rendering contracts, and reusable presentation states.
- Keep intentional failure-mode tests isolated from the normal browser workflow suite.
- Keep repository operations, dependency updates, and release checks documented rather than tribal.
- Keep documentation links, anchors, and referenced package scripts verifiable as the repo grows.
- Keep license policy changes explicit and reviewed when dependencies change.
- Keep runtime version changes aligned across `.nvmrc`, package engines, CI, and docs.
- Keep security automation aligned with the areas where user data or future service boundaries can be affected.
- Keep the production Content Security Policy aligned with intentional scripts, styles, images, network calls, workers, media, manifests, forms, and embeds.
- Keep static bundle budget changes explicit and tied to user value.
- Keep offline/PWA behavior limited to generated static assets until account sync creates an explicit backend boundary.
- Keep future database access behind reviewed backend APIs; do not expose database credentials or direct SQL access to the browser.
- Keep web metadata paths compatible with the `/notesense/` GitHub Pages base path.
- Keep deployment base-path assumptions tested rather than relying on manual live-site checks alone.
- Keep live deployment verification repeatable when hosting, domain, PWA, or Workbox assumptions change.
- Keep architecture decisions explicit through ADRs when they affect data, deployment, quality gates, or service boundaries.

## Near-Term Product Roadmap

- Add richer practice history charts.
- Add configurable daily goals and weekly targets.
- Add richer practice plans that combine mastery streaks and spaced review.
- Add expanded ranges, sharps, and flats.
- Add MIDI keyboard input.
- Add anonymous local profile naming.
- Add sign-in behind a feature flag.
- Add cloud sync for completed sessions and settings.
