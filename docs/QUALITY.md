# Quality Runbook

This runbook keeps NoteSense moving toward a production-quality portfolio product while the app remains small and local-first.

## Definition Of Ready

A change is ready to build when it has a clear purpose:

- Product improvement: helps a learner practice, understand progress, or trust the app.
- Engineering improvement: reduces risk, improves maintainability, strengthens tests, or improves deployment safety.
- Documentation improvement: makes setup, review, release, or future backend work easier.

Avoid adding features just to make the project larger.

## Definition Of Done

A change is done when:

- The behavior is implemented in the smallest responsible area of the codebase.
- Product-scope docs and `npm run product:check` stay aligned when supported scope, explicit non-goals, roadmap language, or feature-intake expectations change.
- Product-learning docs and `npm run product:learning` stay aligned when feedback loops, future analytics, experiments, feature flags, support signals, product metrics, delivery metrics, DORA expectations, or roadmap validation changes.
- Source import boundaries pass `npm run architecture:check` when shared contracts, practice logic, storage, hooks, components, or app-shell responsibilities change.
- Source-size budgets pass `npm run architecture:check` so future features split app-shell, hook, component, core, and shared-contract responsibilities before files become too broad.
- Pure practice, analytics, and data-shape logic has unit coverage.
- Core practice and storage modules meet the configured Vitest coverage thresholds.
- Shared data contract modules meet the configured Vitest coverage thresholds when they change.
- Reusable UI components have focused component coverage for accessibility labels and state rendering where browser workflows would be too broad.
- User workflows have browser coverage when UI, persistence, import/export, or accessibility-sensitive behavior changes.
- Design-system docs and `npm run design:check` stay aligned when layout, color, spacing, typography, or component states change.
- Accessibility contract docs and `npm run accessibility:check` stay aligned when keyboard, screen reader, focus, contrast, motion, or automated accessibility coverage changes.
- Accessibility conformance evidence stays aligned when WCAG targets, manual assistive-technology review, or accessibility release evidence changes.
- Testing contract docs and `npm run testing:check` stay aligned when package scripts, coverage thresholds, browser configs, CI quality gates, or test ownership changes.
- Browser-support docs and `npm run browsers:check` stay aligned when supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, runtime-surface policy, or browser verification evidence changes.
- Performance docs and `npm run performance:check` stay aligned when bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations change.
- Protected shell states have visual-regression coverage for desktop/mobile and light/dark when UI changes intentionally affect layout or appearance.
- TypeScript strictness flags stay enabled for optional properties, indexed access, overrides, and unused code.
- Privacy and data-handling docs stay aligned with local storage, import/export, analytics, network, auth, and sync behavior.
- Data-contract docs and `npm run data:check` stay aligned when storage keys, export schema, import normalization, or future sync assumptions change.
- Threat model and backend-readiness docs stay aligned before account, API, database, sync, or cloud infrastructure work begins.
- Security/privacy docs and `npm run security:privacy` stay aligned when local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, telemetry, analytics, or security posture changes.
- Documentation links, anchors, and documented npm script references stay resolvable.
- ADR index and `npm run adr:check` stay aligned when decision records are added, renamed, removed, or moved between statuses.
- Review/intake docs and `npm run review:check` stay aligned when CODEOWNERS, issue templates, PR templates, labels, triage routing, or review evidence expectations change.
- Operations docs stay aligned when release-health signals, incident response, deployment ownership, monitoring, telemetry, or support expectations change.
- Operations runbook and `npm run operations:check` stay aligned when release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, monitoring, telemetry, or support expectations change.
- Observability docs and `npm run observability:check` stay aligned when production visibility, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA metrics, support expectations, or production signal ownership changes.
- Release-safety docs and `npm run release:safety` stay aligned when deployment, staging, canary, progressive rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, operations, observability, security, privacy, legal, or backend-readiness expectations change.
- Release notes pass `npm run release:notes` when `CHANGELOG.md`, package version metadata, or release-relevant behavior changes.
- Repository hygiene checks pass so required configuration files stay present and generated, dependency, secret, or local artifact files stay untracked.
- Runtime surface checks pass for client network APIs, cookies, telemetry beacons, websockets, and external URLs.
- Built HTML security policy checks pass before release.
- High and critical npm advisories are absent or explicitly handled.
- The npm lockfile stays on the expected format and resolves dependencies only from registry HTTPS tarballs with `sha512` integrity metadata.
- Dependency licenses pass the lockfile compliance policy.
- Dependency Review passes for pull requests that introduce dependency or lockfile changes.
- GitHub Actions workflow references are pinned to full commit SHAs with source-version comments, and workflow token permissions stay least-privilege.
- GitHub Actions workflows keep reviewed concurrency, timeout, and artifact-retention controls.
- Dependency-maintenance docs and `npm run dependencies:check` stay aligned when Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy changes.
- Legal/licensing docs and `npm run legal:check` stay aligned when root license terms, package metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, code-of-conduct expectations, dependency license policy, release guidance, or PR review guidance changes.
- GitHub repository governance checks pass after branch protection, repository security, Pages, required-check, or workflow-activation changes.
- Static bundle output stays within the documented performance budgets.
- Generated PWA artifacts pass the static-asset-only service worker check.
- Lighthouse CI stays within the documented performance, accessibility, best-practice, and SEO thresholds for the Pages-shaped build.
- Built web metadata, manifest, icon, robots, and sitemap pass the metadata check.
- Intentional render-failure recovery stays covered by the runtime resilience browser test.
- The GitHub Pages build loads from `/notesense/` and starts a drill in the Pages smoke test.
- Offline/PWA changes prove the generated and deployed service worker and Workbox runtime stay within bundle budgets, live verifier checks, and Lighthouse expectations.
- `npm run check` passes.
- `npm run build:pages` passes.
- UI changes have been visually checked at desktop and mobile widths.
- Intentional UI changes refresh and review `npm run test:e2e:visual:update` baselines.
- Documentation is updated when product scope, architecture, quality gates, or data contracts change.

## Local Validation

Use the pinned Node.js runtime first:

```bash
nvm use
npm ci
```

Use this sequence before shipping:

```bash
npm run format:write
npm run verify
```

For focused unit coverage feedback:

```bash
npm run test:coverage
```

For source-boundary feedback:

```bash
npm run architecture:check
```

For data-contract feedback:

```bash
npm run data:check
```

For security/privacy feedback:

```bash
npm run security:privacy
```

For accessibility-contract feedback:

```bash
npm run accessibility:check
```

For testing-contract feedback:

```bash
npm run testing:check
```

For browser-support feedback:

```bash
npm run browsers:check
```

For performance feedback:

```bash
npm run performance:check
```

For policy documentation feedback:

```bash
npm run docs:check
```

For ADR governance feedback:

```bash
npm run adr:check
```

For product-scope feedback:

```bash
npm run product:check
```

For product-learning feedback:

```bash
npm run product:learning
```

For review/intake feedback:

```bash
npm run review:check
```

For dependency-maintenance feedback:

```bash
npm run dependencies:check
```

For legal/licensing feedback:

```bash
npm run legal:check
```

For operations feedback:

```bash
npm run operations:check
```

For observability feedback:

```bash
npm run observability:check
```

For release-safety feedback:

```bash
npm run release:safety
```

For release-note feedback:

```bash
npm run release:notes
```

For visual QA:

- Start the app with `npm run dev`.
- Check the primary practice path.
- Check the progress panel after at least one saved round.
- Check mobile width for text wrapping, button sizing, and horizontal overflow.
- Confirm `npm run design:check` passes when tokens, layout, component states, or visual-regression coverage change.
- Confirm `dist/index.html` uses `/notesense/` asset paths after `npm run build:pages`.
- Confirm `npm run security:policy` passes when HTML shell behavior, Vite build behavior, runtime APIs, or asset categories change.
- Confirm `npm run metadata:check` passes when HTML metadata, static public assets, hosting domain, or Pages base path changes.
- Confirm `npm run pwa:check` passes when service worker generation, static assets, or offline behavior changes.
- Confirm `npm run repo:hygiene` passes when root config, ignore files, runtime config, generated outputs, or local artifact handling changes.
- Confirm `npm run runtime:check` passes when client runtime APIs, URLs, privacy boundaries, or build references change.
- Confirm bundle growth is intentional when `npm run perf:budget` changes or fails.
- Confirm `npm run security:workflows` passes after workflow action, permission, timeout, concurrency, or artifact-retention changes.
- Confirm `npm run test:coverage` passes when practice-engine, analytics, or storage behavior changes.
- Confirm `npm run test:coverage` passes when shared data contracts or reusable UI component states change.
- Confirm `npm run test:e2e:resilience` passes when app shell, error-boundary, or root rendering behavior changes.
- Confirm `npm run test:e2e:pages` passes when deployment base path, build output, or preview behavior changes.
- Confirm `npm run test:e2e:visual` passes when protected shell layout, color, spacing, typography, or component appearance changes.
- Confirm `npm run ops:repository` passes after branch protection, repository security, Pages, required-check, or workflow-activation changes.
- Confirm `npm run security:lockfile` passes after dependency, lockfile, Node, or npm runtime changes.

## Accessibility Checklist

- `docs/ACCESSIBILITY.md` defines the product accessibility standard, WCAG 2.2 Level AA target, keyboard and focus rules, screen reader semantics, visual and motion rules, automated coverage, assistive-technology review expectations, manual review expectations, and change process.
- `npm run accessibility:check` verifies that source semantics, styles, browser tests, lint rules, and docs stay aligned.
- All interactive controls are keyboard reachable.
- Focus rings are visible and not clipped.
- Button and status text fits at mobile widths.
- Color contrast passes automated axe checks.
- SVGs that communicate data have useful labels.
- Decorative SVG/text is hidden from assistive technology.
- Manual review notes identify any unavailable assistive-technology profile or deferred WCAG evidence.
- Motion respects `prefers-reduced-motion`.

## Design System

- `docs/DESIGN_SYSTEM.md` defines the product posture, token layers, component states, accessibility expectations, protected visual surface, and UI change process.
- `npm run design:check` verifies that the design-system document, CSS token/state contract, visual-regression tests, and committed baselines stay aligned.
- `npm run design:check` rejects hard-coded theme colors outside token definitions so component styles consume semantic CSS custom properties.
- Durable UI patterns should become documented tokens or states instead of one-off values.
- UI changes that affect layout, color, spacing, typography, or component appearance should run `npm run design:check` and `npm run test:e2e:visual`.

## TypeScript Checklist

- Keep `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, and `noUnusedParameters` enabled.
- Model optional data by omitting absent properties or by explicitly allowing `undefined` in the type.
- Treat array indexing and record lookup as fallible unless the code proves a fallback.
- Use `override` on class members that intentionally replace base-class behavior.

## Testing Strategy

- `docs/TESTING.md` defines test ownership, change routing, determinism, coverage, CI, review, and verification expectations.
- `npm run testing:check` verifies that package scripts, coverage thresholds, browser configs, workflow specs, and CI evidence stay aligned.
- Browser preview servers should use explicit ports that match Playwright `baseURL` and web-server URLs, with Vite preview configs using `--strictPort`.
- Put pure practice, data, and merge behavior in Vitest when possible.
- Use browser tests for workflows, accessibility-sensitive behavior, persistence, import/export, responsive behavior, and deployment shape.
- Use visual-regression tests only for intentional protected-shell appearance changes.

## Browser Support

- `docs/BROWSER_SUPPORT.md` defines supported engines, device shapes, runtime assumptions, unsupported surfaces, and browser verification evidence.
- `npm run browsers:check` verifies Playwright browser projects, Pages/mobile support, visual-regression profiles, PWA/runtime boundaries, and browser-support docs stay aligned.
- Browser-support changes should keep accessibility, testing, release, runtime-surface, PWA, and PR review guidance aligned.

## Performance

- `docs/PERFORMANCE.md` defines the product performance standard, bundle budgets, Lighthouse signal, static asset boundaries, and performance verification evidence.
- `npm run performance:check` verifies bundle budgets, Lighthouse thresholds, metadata/PWA/runtime checks, Pages smoke coverage, and performance-review guidance stay aligned.
- Performance changes should keep browser support, dependency maintenance, release, runtime-surface, PWA, Pages, and PR review guidance aligned.

## Decision Records

- `docs/adr/README.md` indexes durable architecture decisions and documents the ADR process.
- `npm run adr:check` verifies ADR filenames, headings, statuses, required sections, sequential numbering, and index links.
- Add an ADR when a change affects data ownership, deployment, quality gates, runtime policy, security posture, release process, service boundaries, or future backend direction.

## Product Scope

- `docs/PRODUCT_SCOPE.md` defines the product promise, current supported scope, explicit non-goals, foundation-first rule, feature-intake expectations, and scope-change process.
- `npm run product:check` verifies README scope, explicit non-goals, contributor guidance, review guidance, and foundation-first expectations stay aligned.
- New features should start from a learner problem and product-scope update, not directly from UI code.

## Product Learning

- `docs/PRODUCT_LEARNING.md` defines the current no-analytics learning boundary, feedback inputs, future analytics/experiment rules, feature-flag expectations, delivery-metric timing, and review cadence.
- `npm run product:learning` verifies feedback-loop boundaries, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review/release guidance stay aligned.
- Product decisions should name the learner problem and intended learning signal before implementation.

## Review And Intake

- `docs/REVIEW_PROCESS.md` defines ownership, issue intake, triage, PR evidence, and review-process verification.
- `npm run review:check` verifies CODEOWNERS, issue templates, PR template, security routing, and review evidence stay aligned.
- Product proposals should start from learner problem and scope before implementation.

## Architecture Boundaries

- `shared/src` owns framework-agnostic data contracts and merge logic.
- `src/practiceEngine.ts` and `src/noteData.ts` stay pure, deterministic, and independent of React, storage, browser globals, audio, hooks, and UI components.
- `src/storage.ts` owns LocalStorage persistence, normalization, migration, import, and export.
- `src/hooks` owns React state orchestration and should not depend on presentation components.
- `src/components` stays presentation-focused and receives persistence, audio, and session behavior through props.
- `src/App.tsx` remains the product coordinator that composes hooks, storage actions, and components.
- `npm run architecture:check` enforces these boundaries and source-size budgets before CI review.

## Data And Persistence Checklist

When touching progress, settings, history, import, or export:

- Add defaults for older local data.
- Normalize untrusted imported values.
- Keep export schemas versioned.
- Preserve a path for anonymous local users to migrate into a future account.
- Surface storage failures without crashing the practice loop.
- Update `docs/PRIVACY.md` if stored fields, export contents, network behavior, analytics, account migration, or sync behavior changes.
- Update `docs/THREAT_MODEL.md` and `docs/BACKEND_READINESS.md` before introducing auth, API calls, PostgreSQL, AWS services, or cloud sync.

## Security And Privacy

- `docs/SECURITY_PRIVACY.md` defines the local-first security/privacy standard, protected surface, runtime/build boundaries, future auth/sync rules, review evidence, and release evidence.
- `npm run security:privacy` verifies privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface, CSP, PWA, supply-chain, and review/release guidance stay aligned.
- Security/privacy changes should keep product scope, data, testing, browser support, performance, operations, release, architecture, and PR review guidance aligned.

## Policy Docs

- `npm run docs:check` verifies that policy and governance docs remain linked and aligned.
- `npm run docs:check` also validates local Markdown links, anchors, and documented npm script references.
- `npm run data:check` verifies that storage keys, export schema, import normalization, privacy docs, and browser coverage stay aligned.
- `docs/LEGAL.md` defines the project license boundary, user-facing legal triggers, community-conduct expectations, dependency-license separation, and legal-change process.
- Privacy docs must describe current browser storage keys, import/export boundaries, tracking behavior, and future account or sync expectations.
- Security and release docs must keep privacy-impacting changes visible during review and release.

## Legal And Licensing

- The root `LICENSE` file defines the current project source-code and owned-asset permission boundary.
- `package.json` stays private and uses `license: "UNLICENSED"` until the owner intentionally chooses another distribution model.
- `npm run legal:check` verifies root license terms, package metadata, legal docs, code-of-conduct expectations, dependency-license boundaries, release guidance, and PR review guidance stay aligned.
- Dependency license compliance does not grant rights to NoteSense's own source code.
- Keep `CODE_OF_CONDUCT.md` present and aligned with contributor-community guidance; add user-facing terms and externally hosted privacy-policy details before hosted accounts, telemetry, paid services, public sharing, support queues, or external contributor workflows need them.

## Repository Hygiene

- `npm run repo:hygiene` verifies required root configuration files stay present.
- The check verifies `.gitignore` and `.prettierignore` keep generated outputs, dependency installs, logs, build-info files, and local artifacts out of normal review paths.
- The check verifies `.nvmrc`, package engines, `packageManager`, and `.npmrc` stay aligned with the pinned runtime policy.
- Tracked `dist`, `coverage`, `.lighthouseci`, `playwright-report`, `test-results`, `node_modules`, `.env`, logs, TypeScript build-info files, and generated Vite config artifacts fail the gate.

## Runtime Surface

- `npm run runtime:check` scans client source and built Pages HTML after `npm run build:pages`.
- The check blocks accidental client source `fetch`, XHR, telemetry beacons, websockets, event streams, cookies, and worker script imports.
- The check only allows approved external URLs for the GitHub Pages canonical/sitemap metadata and XML/SVG namespaces.
- Future network, auth, analytics, telemetry, sync, or third-party script work should update the runtime-surface check, privacy docs, architecture notes, and ADRs together.

## Offline PWA

- The service worker is generated by `vite-plugin-pwa` during production builds only.
- `npm run pwa:check` verifies the generated service worker imports only the local Workbox runtime and precaches reviewed static assets.
- The generated service worker should precache reviewed static Pages assets and avoid custom runtime API caching, background sync, push notifications, analytics, and practice-data storage.
- Service worker and Workbox files count toward `npm run perf:budget`.
- PWA behavior is covered by `npm run pwa:check`; Lighthouse covers complementary performance, accessibility, best-practice, and SEO signals.
- `npm run deploy:verify-live` also checks the deployed service worker, local Workbox runtime, and static precache entries after release.

## Release Checklist

Before pushing to `main`:

- `npm run verify`
- Review the diff for unrelated churn.
- Confirm `npm run product:learning` passes when feedback loops, future analytics, experiments, feature flags, support signals, delivery metrics, DORA expectations, or roadmap validation change.
- Confirm `npm run release:safety` passes when deployment, staging, rollback, provenance, artifact, Pages, workflow, or release-signoff expectations change.
- Confirm `npm run release:notes` passes when release notes or package version metadata change.
- Confirm generated folders such as `dist`, `playwright-report`, and `test-results` remain untracked.

After pushing:

- Confirm the `CI` workflow succeeds.
- Confirm the `Dependency Review` workflow succeeds when dependency or lockfile changes are in a pull request.
- Confirm the `Visual Regression` workflow succeeds when UI, CSS, screenshots, Playwright, or browser rendering behavior changes.
- Confirm the `CodeQL` workflow succeeds for changes that affect source, workflows, or security-sensitive paths.
- Confirm the `Deploy Pages` workflow succeeds.
- Confirm the `Lighthouse` workflow succeeds when UI, PWA, metadata, bundle, or deployment-shape behavior changes.
- Run `npm run deploy:verify-live`.
- Run `npm run ops:repository` after repository governance changes.

## Dependency Maintenance

- `docs/DEPENDENCY_MAINTENANCE.md` defines dependency sources, Dependabot policy, update classes, review evidence, and dependency-maintenance verification.
- `npm run dependencies:check` verifies Dependabot cadence, dependency review evidence, lockfile policy, license policy, supply-chain gates, and workflow-update expectations stay aligned.
- Dependabot opens routine npm minor/patch updates and GitHub Actions updates weekly.
- Major npm upgrades should be tracked as engineering tasks because they can affect peer dependencies, test tooling, bundling, or browser coverage.
- Node/npm runtime upgrades should update `.nvmrc`, package engines, workflow behavior, docs, and ADRs together.
- Dependency PRs are not ready to merge until `npm run verify`, Dependency Review, and remote CodeQL checks pass on the branch.
- Dependency PRs that introduce new licenses should explain why the license is acceptable before updating the policy.
- GitHub Actions updates should preserve full-SHA pinning, update the source-version comment, keep token permissions least-privilege, and retain reviewed operational controls in the same change.

## Lockfile Supply Chain

- `npm run security:lockfile` verifies `package-lock.json` uses the expected npm lockfile version.
- The check verifies lockfile root package metadata stays aligned with `package.json`.
- Package entries must resolve from `https://registry.npmjs.org/` tarballs and include `sha512` integrity metadata.
- Link dependencies, non-`node_modules` package paths, non-registry tarballs, and missing integrity hashes fail the gate.
- Run this check after dependency, lockfile, Node, or npm runtime changes.

## License Compliance

- `npm run compliance:licenses` checks installed dependency licenses from `package-lock.json`.
- Missing, unknown, GPL-family, AGPL-family, LGPL-family, and SSPL-family licenses fail the gate.
- License allowlist changes should be reviewed as supply-chain policy changes, not routine formatting updates.

## Security Scanning

- `npm run security:audit` blocks high and critical advisories from the release gate.
- `npm run security:lockfile` blocks unreviewed lockfile source, integrity, package-manager, and root-metadata drift.
- `npm run security:supply-chain` combines audit, lockfile, license, and workflow policy checks.
- `npm run security:workflows` blocks floating GitHub Actions refs, unreviewed token-permission drift, missing concurrency controls, unbounded job runtimes, and excessive artifact retention in workflow files.
- `npm run security:policy` verifies the built HTML Content Security Policy after `npm run build:pages`.
- Dependency Review blocks high-severity vulnerable dependency additions and invalid dependency licenses on pull requests.
- CodeQL scans JavaScript and TypeScript on pushes, pull requests, and a weekly schedule.
- Import/export parsing, storage migration, future auth, future sync, and future backend boundaries should be treated as security-sensitive areas.

## Repository Governance

- `npm run ops:repository` verifies GitHub repository settings through `gh`.
- The check covers public visibility, the default branch, Pages, secret scanning, push protection, Dependabot security updates, vulnerability alerts, branch protection, required checks, review policy, and active workflows.
- This check is intentionally separate from `npm run verify` because it requires GitHub authentication and network access.
- Run it after branch protection, required status checks, repository security settings, Pages settings, or workflow activation changes.

## Operations Readiness

- `docs/OPERATIONS.md` defines the supported production surface, release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, current observability boundary, and future observability requirements.
- `npm run operations:check` verifies the runbook, release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, and operations-review guidance stay aligned.
- `docs/OBSERVABILITY.md` defines the current production visibility boundary, future signal rules, incident-learning expectations, and SLO/SLA boundary.
- `npm run observability:check` verifies production visibility, future telemetry rules, incident-review templates, SLO/SLA expectations, and review/release guidance stay aligned.
- `docs/PRODUCT_LEARNING.md` defines product feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review cadence.
- `npm run product:learning` verifies feedback-loop boundaries, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review/release guidance stay aligned.
- `docs/RELEASE_SAFETY.md` defines the current direct-to-Pages release boundary, rollout triggers, provenance/artifact expectations, and rollback/recovery rules.
- `npm run release:safety` verifies direct-to-Pages release boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, and release-review guidance stay aligned.
- Current operations rely on deterministic checks, GitHub Actions, public deployment verification, repository governance, and user reports rather than analytics or telemetry.
- Update the runbook when release, deployment, PWA, repository-governance, security, privacy, backend-readiness, monitoring, telemetry, or support assumptions change.
- Before accounts, sync, APIs, or managed storage ship, operations docs must cover client error reporting, service metrics, structured logs, alerts, data-workflow monitoring, rollback, and migration monitoring.

## Workflow Operations

- `npm run security:workflow-operations` verifies GitHub Actions workflows have a top-level concurrency policy with cancellation enabled.
- Every workflow job must declare `timeout-minutes` between 1 and 20.
- Debug artifact uploads through `actions/upload-artifact` must use `if-no-files-found: ignore` and retention of 14 days or less.
- Workflow operational policy changes should be reviewed with the same care as token permissions because they affect cost, queue health, and failure-data retention.

## Browser Security Policy

- The production build injects a Content Security Policy meta tag through `vite.config.ts`.
- The policy blocks unexpected connections, object embeds, media, workers, forms, and non-self scripts/styles while preserving local static assets and generated pitch playback.
- Future network, analytics, sync, worker, media, third-party asset, or form behavior should update the policy check, runtime-surface check, privacy docs, architecture notes, release guide, and ADRs together.

## Performance Budget

- `npm run perf:budget` checks raw and gzip sizes for built JavaScript, CSS, and HTML.
- The budget runs after `npm run build:pages` inside `npm run verify`.
- Budget increases should be intentional, reviewed, and documented in the same change that needs them.

## Lighthouse

- The `Lighthouse` GitHub Actions workflow builds the Pages app and audits `http://127.0.0.1:4174/notesense/` through the same preview server used by the Pages smoke test.
- Accessibility Lighthouse scores are release-blocking; performance, best-practice, and SEO scores warn so they remain visible without blocking small local-first changes prematurely.
- Lighthouse report artifacts are retained for debugging when scores drift.

## Web Metadata

- `npm run metadata:check` verifies built HTML metadata and copied public assets after `npm run build:pages`.
- The check covers the favicon, web manifest, robots file, sitemap, canonical URL, theme color, Open Graph tags, and Twitter summary tags.
- Metadata paths should remain compatible with the `/notesense/` GitHub Pages base path.

## Unit Coverage

- `npm run test:coverage` measures the framework-independent practice and storage modules.
- Coverage thresholds live in `vite.config.ts` and are included in `npm run check`.
- `@testing-library/react` component tests run in jsdom for reusable UI contracts that do not need the full Playwright workflow.
- UI coverage stays workflow-based through Playwright and axe-core rather than line-based component coverage.

## Visual Regression

- `npm run test:e2e:visual` checks committed Playwright screenshot baselines for note-reading and pitch-training shells.
- Browser workflow tests block service workers so functional UI checks stay deterministic; PWA behavior is covered by `npm run pwa:check`, `npm run deploy:verify-live`, and Lighthouse.
- The visual-regression workflow runs on macOS with Chromium so local baseline updates and remote checks use the same platform family.
- Baselines cover desktop, mobile, light theme, and dark theme.
- Intentional UI changes should update the baselines with `npm run test:e2e:visual:update` and review the resulting images before commit.
- Visual regression complements, but does not replace, axe checks, keyboard checks, and manual product judgment.

## Deployment Smoke

- `npm run test:e2e:pages` verifies the Pages build at `/notesense/`.
- The smoke test fails on broken asset requests, browser console errors, page errors, viewport overflow, or inability to start a drill.
- The smoke test is intentionally narrow; full workflow coverage stays in `npm run test:e2e`.
- `npm run deploy:verify-live` checks the public GitHub Pages URL, deployed metadata assets, deployed service worker, deployed Workbox runtime, and deployed security policy after deployment.

## Runtime Resilience

- `npm run test:e2e:resilience` builds the app in Playwright-only resilience mode and forces a render failure before the practice UI mounts.
- The resilience test verifies an accessible recovery screen instead of a blank app.
- The normal browser suite continues to fail on unexpected console errors and page errors.
