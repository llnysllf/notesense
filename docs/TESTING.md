# Testing Contract

NoteSense keeps a small product surface, but the testing system should still make quality ownership explicit. This contract explains which test layer owns which risk so future work can add confidence in the right place instead of piling every assertion into one broad browser test.

## Test Ownership Matrix

- Formatting and static analysis: `npm run format:check`, `npm run lint`, and `npm run typecheck` own code style, JSX accessibility linting, React hook rules, and strict TypeScript correctness.
- Repository and documentation contracts: `npm run repo:hygiene`, `npm run docs:check`, `npm run adr:check`, `npm run product:check`, `npm run review:check`, `npm run architecture:check`, `npm run data:check`, `npm run design:check`, `npm run accessibility:check`, `npm run testing:check`, and `npm run release:notes` own foundation drift.
- Unit and component tests: `npm run test` owns pure practice logic, data contracts, merge behavior, storage behavior, and reusable UI component states.
- Coverage: `npm run test:coverage` owns per-file thresholds for the framework-independent practice, storage, and shared data modules.
- Browser workflow tests: `npm run test:e2e` owns the production-preview practice loop, keyboard answers, import/export, storage failures, responsive overflow, axe scans, and cross-browser behavior.
- Runtime resilience tests: `npm run test:e2e:resilience` owns the app-level recovery screen when rendering fails.
- Pages smoke tests: `npm run test:e2e:pages` owns the GitHub Pages `/notesense/` base path, metadata, CSP, asset loading, and deployment-shaped drill start.
- Visual regression tests: `npm run test:e2e:visual` owns protected shell screenshots for note-reading and pitch-training across desktop/mobile and light/dark themes.
- Release verification: `npm run verify` owns the full local release gate, including supply-chain checks, quality checks, browser suites, Pages build, PWA checks, runtime-surface checks, bundle budgets, and Pages smoke coverage.

## Change Routing

- Add or update unit tests when pure calculations, data normalization, storage migration, merge behavior, or reducer-style state changes.
- Add or update component tests when a reusable component state, ARIA label, meter, chart label, or empty state changes and the full browser workflow would be too broad.
- Add or update main Playwright tests when a learner workflow, keyboard behavior, persistence path, import/export path, accessibility-sensitive behavior, or responsive behavior changes.
- Add or update resilience tests when the app shell, root render path, or error boundary changes.
- Add or update Pages smoke tests when build output, base-path behavior, metadata, CSP, static assets, or preview serving changes.
- Add or update visual-regression baselines when intentional UI changes affect layout, color, spacing, typography, or protected component appearance.
- Add or update contract checks when a quality policy, documentation promise, source boundary, data contract, design contract, accessibility contract, or release rule changes.
- Add or update ADR checks when a durable decision is added, renamed, removed, re-statused, or moved in the index.

## Determinism Rules

- Browser tests run against production preview builds, not the development server.
- UI behavior tests block service workers so cache lifecycle timing does not affect workflow results.
- PWA behavior is verified through generated-artifact checks, live deployment checks, and Lighthouse instead of being mixed into normal UI tests.
- Browser suites fail on uncaught page errors and unexpected console errors.
- Playwright keeps traces only on failure.
- Visual tests clear local storage and fix randomness before screenshots.
- Generated artifacts such as `dist`, `coverage`, `playwright-report`, and `test-results` must stay untracked.

## Coverage Rules

- Coverage thresholds are per-file for `src/practiceEngine.ts`, `src/storage.ts`, `shared/src/practiceData.ts`, and `shared/src/merge.ts`.
- Coverage supports confidence in framework-independent logic; it does not replace browser workflow, accessibility, Pages, visual, PWA, runtime-surface, or release checks.
- Lowering thresholds, excluding a covered module, or moving core behavior out of covered modules should be treated as a release-quality change.

## CI Contract

- Pull requests and pushes to `main` run the `CI` Quality gate.
- CI installs dependencies with `npm ci` and uses the Node.js version pinned in `.nvmrc`.
- CI installs Chromium, Firefox, and WebKit for Playwright coverage.
- CI runs `npm run verify`.
- Browser failure artifacts are uploaded only on failure and retained for a short debugging window.
- Dedicated workflows own CodeQL, Dependency Review, Lighthouse, Visual Regression, and Pages deployment evidence.

## Review Rules

- A PR is not ready until the relevant test layer for the changed risk has evidence.
- Avoid adding broad browser assertions for pure logic that can be tested deterministically in Vitest.
- Avoid snapshot updates that hide unexpected UI drift.
- Explain intentionally reduced coverage, changed thresholds, skipped browser cases, or deleted test paths in the PR.

## Verification

`npm run testing:check` verifies that:

- this testing contract keeps ownership, routing, determinism, coverage, CI, review, and verification sections
- package scripts keep the documented testing gates available
- ADR governance stays part of the foundation contract gate
- product-scope governance stays part of the foundation contract gate
- review/intake governance stays part of the foundation contract gate
- Vitest coverage thresholds remain per-file for core modules
- Playwright configs keep service workers blocked, traces retained on failure, and expected browser projects
- browser specs continue to cover accessibility, keyboard, import/export, storage failure, responsive, resilience, Pages, and visual-regression behavior
- CI still runs `npm run verify` and uploads browser failure artifacts only on failure
