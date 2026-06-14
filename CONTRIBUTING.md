# Contributing

NoteSense is intentionally small, but changes should still meet a production-quality bar. The app is a learning tool, so correctness, accessibility, and calm UX matter more than feature volume.

## Local Setup

```bash
nvm use
npm ci
npm run dev
```

## Before Opening a Pull Request

Run the full local gate:

```bash
npm run verify
```

For UI changes, also verify the app manually at desktop and mobile widths. Check that text fits, keyboard focus is visible, controls are reachable without a mouse, and automated axe checks still pass.

For token, layout, component-state, or visual-regression changes, keep [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) aligned and run the design-system contract check:

```bash
npm run design:check
```

For accessibility-sensitive UI, style, copy, Playwright, Lighthouse, or recovery-surface changes, keep [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) aligned and run the accessibility contract check:

```bash
npm run accessibility:check
```

For test ownership, coverage, Playwright config, CI quality-gate, or workflow evidence changes, keep [docs/TESTING.md](docs/TESTING.md) aligned and run the testing contract check:

```bash
npm run testing:check
```

For browser-support, Playwright project, Pages smoke, visual-regression, PWA, runtime-surface, Lighthouse, or browser-support documentation changes, keep [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md) aligned and run the browser-support contract check:

```bash
npm run browsers:check
```

For performance-budget, Lighthouse, metadata, PWA, runtime-surface, Pages smoke, dependency, browser-support, or performance-doc changes, keep [docs/PERFORMANCE.md](docs/PERFORMANCE.md) aligned and run the performance contract check:

```bash
npm run performance:check
```

For architecture decision changes, keep [docs/adr/README.md](docs/adr/README.md) aligned and run the ADR governance check:

```bash
npm run adr:check
```

For product-scope changes, keep [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) aligned and run the product-scope contract check:

```bash
npm run product:check
```

For review, intake, issue-template, PR-template, CODEOWNERS, or triage-process changes, keep [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md) aligned and run the review/intake contract check:

```bash
npm run review:check
```

For dependency-maintenance, Dependabot, package manager, lockfile-policy, license-policy, or workflow-update-policy changes, keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned and run the dependency-maintenance contract check:

```bash
npm run dependencies:check
```

For intentional visual changes, refresh and review the screenshot baselines:

```bash
npm run test:e2e:visual:update
```

## Engineering Expectations

- Keep practice logic in pure TypeScript where possible, especially in `src/practiceEngine.ts`.
- Keep persistence and import/export changes behind `src/storage.ts`.
- Keep [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md) aligned with storage keys, export schema, import normalization, and future sync assumptions; run `npm run data:check` after data-shape changes.
- Keep shared contracts, practice logic, storage, hooks, and components inside the documented import boundaries; run `npm run architecture:check` after moving source responsibilities.
- Add or update tests for new behavior, migrations, accessibility-sensitive UI, and practice analytics.
- Keep [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) aligned with keyboard, screen reader, focus, contrast, motion, and automated coverage expectations; run `npm run accessibility:check` after accessibility-sensitive changes.
- Keep [docs/TESTING.md](docs/TESTING.md) aligned with package scripts, coverage thresholds, Playwright configs, CI quality gates, and test ownership; run `npm run testing:check` after test-system changes.
- Keep [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md) aligned when changing supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, or browser verification evidence; run `npm run browsers:check` after browser-support changes.
- Keep [docs/PERFORMANCE.md](docs/PERFORMANCE.md) aligned when changing bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations; run `npm run performance:check` after performance-sensitive changes.
- Keep [docs/adr/README.md](docs/adr/README.md) aligned when adding, renaming, removing, or changing ADR status; run `npm run adr:check` after ADR changes.
- Keep [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) aligned when changing supported product scope, explicit non-goals, roadmap language, or feature-intake expectations; run `npm run product:check` after product-scope changes.
- Keep [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md) aligned when changing CODEOWNERS, issue templates, PR template, review routing, labels, or triage expectations; run `npm run review:check` after review-process changes.
- Keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned when changing Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy; run `npm run dependencies:check` after dependency-maintenance changes.
- Keep dependency license changes intentional; explain new licenses before updating the allowlist.
- Keep dependency changes passing Dependency Review before merge.
- Keep durable UI patterns documented in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) instead of adding one-off styles.
- Keep workflow action refs pinned to full commit SHAs, document the source version tag in a comment, and keep workflow token permissions least-privilege.
- Run `npm run ops:repository` after branch protection, repository security, Pages, required-check, or workflow-activation changes.
- Update [docs/OPERATIONS.md](docs/OPERATIONS.md) when a change affects release-health signals, incident response, deployment ownership, monitoring, telemetry, or support expectations.
- Keep bundle growth intentional; budget increases need a clear reason in the PR.
- Keep generated outputs, dependency installs, local environment files, logs, and TypeScript build-info files untracked.
- Prefer small, shippable changes with clear user value or clear maintainability value.
- Do not add network services, auth, or cloud storage without preserving the current local-first practice loop.
- Do not add sign-in, sync, PostgreSQL, or AWS services without updating the threat model and backend-readiness docs first.
- Update [docs/PRIVACY.md](docs/PRIVACY.md) when a change affects account data, sync, storage, import/export, analytics, or network behavior.
- Keep runtime changes explicit: update `.nvmrc`, `package.json` engines, GitHub Actions behavior, and ADRs together.
- Keep release notes aligned with user-visible, architecture, release, security, dependency, and operations changes; run `npm run release:notes` after editing `CHANGELOG.md` or `package.json` version metadata.
- Record meaningful architecture decisions in `docs/adr` when a change affects data ownership, deployment, quality gates, or future backend boundaries.

## Pull Request Shape

A strong PR includes:

- A short product/engineering summary.
- Confirmation that `npm run verify` passed.
- Screenshots or notes for visual UI changes.
- Updated visual-regression baselines when UI changes intentionally affect the protected shells.
- Any migration, accessibility, deployment, dependency license, security, or data-shape risks.
