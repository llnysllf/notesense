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
- Pure practice, analytics, and data-shape logic has unit coverage.
- Core practice and storage modules meet the configured Vitest coverage thresholds.
- Shared data contract modules meet the configured Vitest coverage thresholds when they change.
- Reusable UI components have focused component coverage for accessibility labels and state rendering where browser workflows would be too broad.
- User workflows have browser coverage when UI, persistence, import/export, or accessibility-sensitive behavior changes.
- TypeScript strictness flags stay enabled for optional properties, indexed access, overrides, and unused code.
- Privacy and data-handling docs stay aligned with local storage, import/export, analytics, network, auth, and sync behavior.
- Documentation links, anchors, and documented npm script references stay resolvable.
- Runtime surface checks pass for client network APIs, cookies, telemetry beacons, websockets, and external URLs.
- Built HTML security policy checks pass before release.
- High and critical npm advisories are absent or explicitly handled.
- Dependency licenses pass the lockfile compliance policy.
- Static bundle output stays within the documented performance budgets.
- Generated PWA artifacts pass the static-asset-only service worker check.
- Lighthouse CI stays within the documented performance, accessibility, best-practice, and SEO thresholds for the Pages-shaped build.
- Built web metadata, manifest, icon, robots, and sitemap pass the metadata check.
- Intentional render-failure recovery stays covered by the runtime resilience browser test.
- The GitHub Pages build loads from `/notesense/` and starts a drill in the Pages smoke test.
- Offline/PWA changes prove the generated service worker and Workbox runtime stay within bundle budgets and Lighthouse expectations.
- `npm run check` passes.
- `npm run build:pages` passes.
- UI changes have been visually checked at desktop and mobile widths.
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

For policy documentation feedback:

```bash
npm run docs:check
```

For visual QA:

- Start the app with `npm run dev`.
- Check the primary practice path.
- Check the progress panel after at least one saved round.
- Check mobile width for text wrapping, button sizing, and horizontal overflow.
- Confirm `dist/index.html` uses `/notesense/` asset paths after `npm run build:pages`.
- Confirm `npm run security:policy` passes when HTML shell behavior, Vite build behavior, runtime APIs, or asset categories change.
- Confirm `npm run metadata:check` passes when HTML metadata, static public assets, hosting domain, or Pages base path changes.
- Confirm `npm run pwa:check` passes when service worker generation, static assets, or offline behavior changes.
- Confirm `npm run runtime:check` passes when client runtime APIs, URLs, privacy boundaries, or build references change.
- Confirm bundle growth is intentional when `npm run perf:budget` changes or fails.
- Confirm `npm run test:coverage` passes when practice-engine, analytics, or storage behavior changes.
- Confirm `npm run test:coverage` passes when shared data contracts or reusable UI component states change.
- Confirm `npm run test:e2e:resilience` passes when app shell, error-boundary, or root rendering behavior changes.
- Confirm `npm run test:e2e:pages` passes when deployment base path, build output, or preview behavior changes.

## Accessibility Checklist

- All interactive controls are keyboard reachable.
- Focus rings are visible and not clipped.
- Button and status text fits at mobile widths.
- Color contrast passes automated axe checks.
- SVGs that communicate data have useful labels.
- Decorative SVG/text is hidden from assistive technology.
- Motion respects `prefers-reduced-motion`.

## TypeScript Checklist

- Keep `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, and `noUnusedParameters` enabled.
- Model optional data by omitting absent properties or by explicitly allowing `undefined` in the type.
- Treat array indexing and record lookup as fallible unless the code proves a fallback.
- Use `override` on class members that intentionally replace base-class behavior.

## Data And Persistence Checklist

When touching progress, settings, history, import, or export:

- Add defaults for older local data.
- Normalize untrusted imported values.
- Keep export schemas versioned.
- Preserve a path for anonymous local users to migrate into a future account.
- Surface storage failures without crashing the practice loop.
- Update `docs/PRIVACY.md` if stored fields, export contents, network behavior, analytics, account migration, or sync behavior changes.

## Policy Docs

- `npm run docs:check` verifies that policy and governance docs remain linked and aligned.
- `npm run docs:check` also validates local Markdown links, anchors, and documented npm script references.
- Privacy docs must describe current browser storage keys, import/export boundaries, tracking behavior, and future account or sync expectations.
- Security and release docs must keep privacy-impacting changes visible during review and release.

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

## Release Checklist

Before pushing to `main`:

- `npm run verify`
- Review the diff for unrelated churn.
- Confirm generated folders such as `dist`, `playwright-report`, and `test-results` remain untracked.

After pushing:

- Confirm the `CI` workflow succeeds.
- Confirm the `CodeQL` workflow succeeds for changes that affect source, workflows, or security-sensitive paths.
- Confirm the `Deploy Pages` workflow succeeds.
- Confirm the `Lighthouse` workflow succeeds when UI, PWA, metadata, bundle, or deployment-shape behavior changes.
- Run `npm run deploy:verify-live`.

## Dependency Maintenance

- Dependabot opens routine npm minor/patch updates and GitHub Actions updates weekly.
- Major npm upgrades should be tracked as engineering tasks because they can affect peer dependencies, test tooling, bundling, or browser coverage.
- Node/npm runtime upgrades should update `.nvmrc`, package engines, workflow behavior, docs, and ADRs together.
- Dependency PRs are not ready to merge until `npm run verify` and remote CodeQL checks pass on the branch.
- Dependency PRs that introduce new licenses should explain why the license is acceptable before updating the policy.

## License Compliance

- `npm run compliance:licenses` checks installed dependency licenses from `package-lock.json`.
- Missing, unknown, GPL-family, AGPL-family, LGPL-family, and SSPL-family licenses fail the gate.
- License allowlist changes should be reviewed as supply-chain policy changes, not routine formatting updates.

## Security Scanning

- `npm run security:audit` blocks high and critical advisories from the release gate.
- `npm run security:policy` verifies the built HTML Content Security Policy after `npm run build:pages`.
- CodeQL scans JavaScript and TypeScript on pushes, pull requests, and a weekly schedule.
- Import/export parsing, storage migration, future auth, future sync, and future backend boundaries should be treated as security-sensitive areas.

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

## Deployment Smoke

- `npm run test:e2e:pages` verifies the Pages build at `/notesense/`.
- The smoke test fails on broken asset requests, browser console errors, page errors, viewport overflow, or inability to start a drill.
- The smoke test is intentionally narrow; full workflow coverage stays in `npm run test:e2e`.
- `npm run deploy:verify-live` checks the public GitHub Pages URL, deployed metadata assets, and deployed security policy after deployment.

## Runtime Resilience

- `npm run test:e2e:resilience` builds the app in Playwright-only resilience mode and forces a render failure before the practice UI mounts.
- The resilience test verifies an accessible recovery screen instead of a blank app.
- The normal browser suite continues to fail on unexpected console errors and page errors.
