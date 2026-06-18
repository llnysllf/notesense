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
- `docs/adr/README.md` indexes ADRs and documents decision-record process expectations.
- `docs/PRODUCT_SCOPE.md` documents the supported learner surface, explicit non-goals, foundation-first rule, and feature-intake expectations.
- `docs/PRODUCT_LEARNING.md` documents product feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review cadence.
- `docs/REVIEW_PROCESS.md` documents ownership, issue intake, triage, pull-request evidence, and review-process verification.
- `docs/DEPENDENCY_MAINTENANCE.md` documents dependency sources, Dependabot policy, update classes, review evidence, and dependency-maintenance verification.
- `docs/LEGAL.md` documents the project license boundary, user-facing legal triggers, community-conduct expectations, dependency-license separation, and legal-change process.
- `docs/DESIGN_SYSTEM.md` documents the design-token, component-state, accessibility, and visual-regression contract for UI changes.
- `docs/ACCESSIBILITY.md` documents the WCAG alignment, assistive-technology review, keyboard, screen reader, focus, contrast, motion, and automated accessibility coverage contract.
- `docs/TESTING.md` documents test ownership, change routing, determinism, coverage, CI, and review expectations.
- `docs/BROWSER_SUPPORT.md` documents supported engines, device shapes, runtime assumptions, unsupported surfaces, and browser verification evidence.
- `docs/PERFORMANCE.md` documents the product performance standard, bundle budgets, Lighthouse signal, static asset boundaries, and performance verification evidence.
- `docs/SECURITY_PRIVACY.md` documents the local-first security/privacy standard, protected surface, runtime/build boundaries, future auth/sync rules, and review/release evidence.
- `docs/THREAT_MODEL.md` documents current and future security boundaries before account or sync work begins.
- `docs/BACKEND_READINESS.md` documents the service, API, data-model, sync, and PostgreSQL path for future backend work.
- `docs/OPERATIONS.md` documents release-health signals, incident response, rollback, evidence handling, and future observability expectations.
- `docs/OBSERVABILITY.md` documents the production visibility boundary, future signal rules, incident-learning expectations, and SLO/SLA boundary.
- `docs/RELEASE_SAFETY.md` documents the direct-to-Pages release boundary, rollout triggers, provenance/artifact expectations, and rollback/recovery rules.
- `docs/DATA_CONTRACT.md` documents browser storage keys, export schema, import normalization, and future sync constraints.
- `docs/I18N.md` documents the current English-only language boundary, locale-readiness rules, music-learning localization constraints, accessibility/layout expectations, and localization change process.
- `.nvmrc`, package engines, and `.npmrc` define the shared Node/npm runtime for local development, CI, deployment, and dependency maintenance.
- `vite.config.ts` injects the production Content Security Policy meta tag during build.
- `vite.config.ts` also owns PWA service worker generation and Vitest browser-like component-test setup.
- `scripts/check-repository-hygiene.mjs` owns required root configuration, ignore-policy, runtime-policy, and tracked-artifact hygiene checks.
- `scripts/check-adr-contracts.mjs` owns ADR numbering, status, required-section, and index-link checks.
- `scripts/check-product-scope.mjs` owns product-scope drift checks for README scope, explicit non-goals, contributor guidance, review guidance, and release docs.
- `scripts/check-product-learning-contract.mjs` owns product-learning drift checks for feedback loops, future analytics, experiments, feature flags, delivery metrics, release guidance, and PR review guidance.
- `scripts/check-review-process.mjs` owns review/intake drift checks for CODEOWNERS, issue templates, PR template, security routing, and review evidence.
- `scripts/check-dependency-maintenance.mjs` owns dependency-maintenance drift checks for Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, and workflow-update expectations.
- `scripts/check-legal-contract.mjs` owns legal/licensing drift checks for the root license, package metadata, legal docs, code-of-conduct expectations, dependency-license boundaries, release guidance, and PR review guidance.
- `scripts/check-data-contracts.mjs` owns data-contract drift checks for storage keys, shared export shape, privacy docs, and browser coverage.
- `scripts/check-i18n-contract.mjs` owns i18n/l10n drift checks for language boundaries, HTML language metadata, future message ownership, locale formatting, music notation labels, accessibility, layout, data stability, release guidance, and PR review guidance.
- `scripts/check-security-privacy.mjs` owns security/privacy drift checks for privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface, CSP, PWA, supply-chain, and review/release guidance.
- `scripts/check-architecture-boundaries.mjs` owns source import-boundary checks for shared contracts, practice logic, storage, hooks, and UI components.
- `scripts/check-architecture-boundaries.mjs` also owns source-size budgets for the app shell, hooks, components, core modules, and shared contracts so future feature work has an explicit split point before files become catch-all modules.
- `scripts/check-design-system.mjs` owns the lightweight design-system contract for CSS tokens, shell states, accessibility affordances, responsive guards, and visual-regression coverage.
- `scripts/check-accessibility-contracts.mjs` owns accessibility-contract drift checks for source semantics, styles, browser coverage, lint coverage, and release docs.
- `scripts/check-testing-contracts.mjs` owns testing-contract drift checks for package scripts, Vitest coverage thresholds, Playwright configs, browser specs, and CI workflow evidence.
- `scripts/check-browser-support.mjs` owns browser-support drift checks for Playwright browser projects, Pages/mobile support, visual-regression profiles, PWA/runtime boundaries, and browser-support docs.
- `scripts/check-performance-contract.mjs` owns performance-contract drift checks for bundle budgets, Lighthouse thresholds, metadata/PWA/runtime checks, Pages smoke coverage, and performance-review guidance.
- `scripts/check-operations-contract.mjs` owns operations-runbook drift checks for release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, and operations-review guidance.
- `scripts/check-observability-contract.mjs` owns observability drift checks for production visibility, future telemetry rules, incident review templates, SLO/SLA boundaries, release guidance, and PR review guidance.
- `scripts/check-release-safety-contract.mjs` owns release-safety drift checks for deployment boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, release guidance, and PR review guidance.
- `scripts/check-licenses.mjs` owns dependency license policy enforcement.
- `scripts/check-security-policy.mjs` owns built HTML security policy verification.
- `scripts/check-policy-docs.mjs` owns policy document presence and alignment checks.
- `scripts/lib/contract-checks.mjs` owns shared contract-snippet matching for policy and governance checks.
- `scripts/check-doc-integrity.mjs` owns local Markdown link, anchor, and documented npm script reference checks.
- `scripts/check-pwa-artifacts.mjs` owns generated service worker and static precache verification.
- `scripts/check-runtime-surface.mjs` owns client runtime/network surface checks against the local-first privacy boundary.
- `scripts/check-bundle-budget.mjs` owns the static Pages bundle budget.
- `scripts/check-web-metadata.mjs` owns built HTML, manifest, icon, robots, and sitemap verification.
- `scripts/serve-pages-preview.mjs` serves `dist` under `/notesense/` for deployment-shape smoke tests.
- `scripts/verify-live-pages.mjs` owns post-deploy public GitHub Pages, metadata asset, service worker, Workbox runtime, and security policy verification.
- `vite.config.ts` owns Vitest configuration, including coverage thresholds for the framework-independent core modules.
- The same coverage gate includes focused React hook orchestration for settings, progress, data portability, and practice sessions.
- `tsconfig.json` and `tsconfig.node.json` own the strict TypeScript contract for app code and project tooling.
- `docs/PRIVACY.md` documents the current local-first privacy and data-handling boundary.
- `scripts/check-workflow-actions.mjs` owns GitHub Actions reference pinning policy enforcement.
- `scripts/check-workflow-permissions.mjs` owns GitHub Actions token-permission policy enforcement.
- `scripts/check-workflow-operations.mjs` owns GitHub Actions concurrency, timeout, and artifact-retention policy enforcement.
- `scripts/check-github-repository.mjs` owns GitHub repository governance drift detection for branch protection, required checks, security settings, Pages, vulnerability alerts, and active workflows.

## Quality Bar

Every feature should keep these expectations intact:

- Practice logic remains testable outside React.
- Source import boundaries stay enforced by `npm run architecture:check` so shared contracts, practice logic, storage, hooks, and components keep clear responsibilities.
- Source-size budgets stay enforced by `npm run architecture:check` so the app shell, hooks, components, core modules, and shared contracts are split before they become broad ownership buckets.
- New note ranges should be added as data first, then wired through tested selection and settings paths.
- Product analytics and chart inputs are derived in pure functions before rendering.
- Habit analytics are derived from completed sessions so future sync can reconcile daily goals from server history.
- Mastery state remains range-aware so treble, bass, pitch, and future expanded ranges do not leak progress into each other.
- Coaching recommendations stay derived and deterministic until there is a service layer that can own personalization.
- Persistence changes go through a storage boundary instead of being scattered through UI components.
- Cross-device or sync-ready data-shape changes should happen in `shared/src` before UI or backend adapters consume them.
- Privacy expectations must stay aligned with local storage, import/export, future auth, sync, analytics, and network behavior.
- Data-contract changes should keep storage keys, export schema, import normalization, privacy docs, and browser coverage aligned.
- I18n/l10n changes should keep language boundaries, translatable copy, notation labels, locale formatting, right-to-left assumptions, accessibility, layout, data stability, privacy, release guidance, and PR review guidance aligned.
- Security/privacy changes should keep local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, operations guidance, release guidance, and PR review guidance aligned.
- Client runtime surface checks should reject network, tracking, cookie, websocket, or external URL drift unless the change is intentional and documented.
- User-visible state has a failure path, especially for save, export, auth, and sync operations.
- Unexpected render failures should show the app-level recovery screen instead of leaving a blank product surface.
- Accessibility is part of the feature definition, not a final cleanup step.
- Accessibility-contract changes should keep source semantics, focus behavior, reduced-motion behavior, axe coverage, Lighthouse expectations, and release guidance aligned.
- Accessibility conformance changes should keep WCAG targets, assistive-technology review evidence, manual review expectations, release guidance, and PR review guidance aligned.
- Testing-contract changes should keep package scripts, coverage thresholds, browser configs, CI workflow evidence, and release guidance aligned.
- Browser-support changes should keep supported engines, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, PWA/offline behavior, accessibility guidance, testing guidance, release guidance, and PR review guidance aligned.
- Performance-contract changes should keep bundle budgets, Lighthouse thresholds, metadata checks, PWA checks, runtime-surface checks, Pages smoke coverage, browser-support guidance, dependency guidance, release guidance, and PR review guidance aligned.
- ADR changes should keep numbering, status, required sections, index links, release guidance, and contributor guidance aligned.
- Product-scope changes should keep README current scope, explicit non-goals, feature-intake expectations, foundation-first guidance, release guidance, and ADRs aligned.
- Product-learning changes should keep feedback loops, future analytics, experiments, feature flags, support signals, delivery metrics, product scope, observability, privacy, legal, release, operations, backend-readiness, and PR review guidance aligned.
- Review-process changes should keep CODEOWNERS, issue templates, PR evidence, security routing, product-scope guidance, release guidance, and contributor guidance aligned.
- Dependency-maintenance changes should keep Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, release guidance, and contributor guidance aligned.
- Legal/licensing changes should keep root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, code-of-conduct expectations, dependency license policy, release guidance, and PR review guidance aligned.
- Operations-contract changes should keep release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, release guidance, security guidance, privacy guidance, backend-readiness guidance, and PR review guidance aligned.
- Observability changes should keep production visibility, telemetry boundaries, incident learning, SLO/SLA expectations, support, operations, privacy, security, legal, release, backend-readiness, and PR review guidance aligned.
- Release-safety changes should keep deployment, staging, canary, rollback, provenance, SBOM, signing, artifacts, Pages, workflow, operations, observability, security, privacy, legal, backend-readiness, and PR review guidance aligned.
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
- Hook coverage should protect settings, progress, data portability, timers, answer handling, audio callbacks, and session reset orchestration.
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
- Keep UI components from owning persistence, network, audio, or hook orchestration; pass behavior through props from the app shell and hooks.
- Keep export/import schemas versioned.
- Keep privacy documentation updated when data fields, storage keys, export content, tracking behavior, network calls, auth, or sync changes.
- Keep the runtime-surface gate updated with any intentional external URLs, network APIs, auth, analytics, telemetry, or sync behavior.
- Keep coverage thresholds focused on deterministic core modules where line coverage is meaningful.
- Keep hook coverage focused on orchestration boundaries where persistence, timers, answers, and audio callbacks meet React state.
- Keep TypeScript hardening flags enabled as the app grows toward service-backed data.
- Keep network calls outside the core practice engine.
- Keep UI components focused on one product responsibility.
- Keep UI styling aligned with `docs/DESIGN_SYSTEM.md`; new durable visual patterns should update the design-system contract and its checker.
- Keep browser tests tied to real user workflows rather than implementation details.
- Keep component tests focused on accessibility labels, rendering contracts, and reusable presentation states.
- Keep intentional failure-mode tests isolated from the normal browser workflow suite.
- Keep repository operations, dependency updates, and release checks documented rather than tribal.
- Keep operational runbooks aligned when release health, incident response, observability, support, or deployment ownership changes.
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
- Keep source-size budget changes explicit through architecture docs and ADR review when a larger module is genuinely the clearer design.

## Near-Term Product Roadmap

- Add richer practice history charts.
- Add configurable daily goals and weekly targets.
- Add richer practice plans that combine mastery streaks and spaced review.
- Add expanded ranges, sharps, and flats.
- Add MIDI keyboard input.
- Add anonymous local profile naming.
- Add sign-in behind a feature flag.
- Add cloud sync for completed sessions and settings.
