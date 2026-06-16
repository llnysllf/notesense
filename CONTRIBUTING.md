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

Add semantic CSS custom properties before introducing new theme colors; component selectors should consume tokens instead of raw hex, RGB, or HSL values.

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

For product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes, keep [docs/PRODUCT_LEARNING.md](docs/PRODUCT_LEARNING.md) aligned and run the product-learning contract check:

```bash
npm run product:learning
```

For review, intake, issue-template, PR-template, CODEOWNERS, or triage-process changes, keep [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md) aligned and run the review/intake contract check:

```bash
npm run review:check
```

For dependency-maintenance, Dependabot, package manager, lockfile-policy, license-policy, or workflow-update-policy changes, keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned and run the dependency-maintenance contract check:

```bash
npm run dependencies:check
```

For language, locale, translation, notation-label, text-formatting, or localization-readiness changes, keep [docs/I18N.md](docs/I18N.md) aligned and run the i18n contract check:

```bash
npm run i18n:check
```

For legal, licensing, user-facing terms, privacy-policy hosting, contributor-community, or project-license metadata changes, keep [docs/LEGAL.md](docs/LEGAL.md) aligned and run the legal contract check:

```bash
npm run legal:check
```

Participation in issues, pull requests, reviews, and project-managed discussion should follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

For security/privacy, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc changes, keep [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) aligned and run the security/privacy contract check:

```bash
npm run security:privacy
```

For release-health, incident-response, deployment ownership, monitoring, telemetry, support, rollback, or operations-doc changes, keep [docs/OPERATIONS.md](docs/OPERATIONS.md) aligned and run the operations contract check:

```bash
npm run operations:check
```

For observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, support, or production-visibility changes, keep [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) aligned and run the observability contract check:

```bash
npm run observability:check
```

For release-safety, deployment, staging, canary, progressive-rollout, rollback, provenance, SBOM, signing, artifact, Pages, or release-doc changes, keep [docs/RELEASE_SAFETY.md](docs/RELEASE_SAFETY.md) aligned and run the release-safety contract check:

```bash
npm run release:safety
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
- Keep app-shell, hook, component, core, and shared-contract files inside the documented source-size budgets; split responsibilities or update the architecture decision when a budget increase is intentional.
- Add or update tests for new behavior, migrations, accessibility-sensitive UI, and practice analytics.
- Keep [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) aligned with keyboard, screen reader, focus, contrast, motion, and automated coverage expectations; run `npm run accessibility:check` after accessibility-sensitive changes.
- Keep [docs/TESTING.md](docs/TESTING.md) aligned with package scripts, coverage thresholds, Playwright configs, CI quality gates, and test ownership; run `npm run testing:check` after test-system changes.
- Keep [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md) aligned when changing supported browsers, Playwright projects, device profiles, Pages base path, Web Audio behavior, LocalStorage behavior, responsive support, color-scheme support, PWA/offline behavior, or browser verification evidence; run `npm run browsers:check` after browser-support changes.
- Keep [docs/PERFORMANCE.md](docs/PERFORMANCE.md) aligned when changing bundle budgets, tracked asset categories, Lighthouse thresholds, Lighthouse workflow behavior, metadata checks, PWA artifact checks, runtime-surface checks, Pages smoke behavior, or performance review expectations; run `npm run performance:check` after performance-sensitive changes.
- Keep [docs/adr/README.md](docs/adr/README.md) aligned when adding, renaming, removing, or changing ADR status; run `npm run adr:check` after ADR changes.
- Keep [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) aligned when changing supported product scope, explicit non-goals, roadmap language, or feature-intake expectations; run `npm run product:check` after product-scope changes.
- Keep [docs/PRODUCT_LEARNING.md](docs/PRODUCT_LEARNING.md) aligned when changing product feedback, analytics, experiments, feature flags, surveys, support loops, product metrics, delivery metrics, DORA expectations, roadmap validation, or product-learning expectations; run `npm run product:learning` after product-learning-sensitive changes.
- Keep [docs/REVIEW_PROCESS.md](docs/REVIEW_PROCESS.md) aligned when changing CODEOWNERS, issue templates, PR template, review routing, labels, or triage expectations; run `npm run review:check` after review-process changes.
- Keep [docs/DEPENDENCY_MAINTENANCE.md](docs/DEPENDENCY_MAINTENANCE.md) aligned when changing Dependabot cadence, dependency grouping, ignored update types, package manager policy, lockfile policy, license policy, or workflow-update policy; run `npm run dependencies:check` after dependency-maintenance changes.
- Keep [docs/LEGAL.md](docs/LEGAL.md) aligned when changing root license terms, package license metadata, user-facing terms, privacy-policy hosting, contributor-community expectations, dependency license policy, release guidance, or PR review guidance; run `npm run legal:check` after legal-sensitive changes.
- Keep [docs/I18N.md](docs/I18N.md) aligned when changing language boundaries, copy extraction, translated labels, locale formatting, notation labels, right-to-left assumptions, or localization review evidence; run `npm run i18n:check` after i18n-sensitive changes.
- Keep [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) aligned when changing contributor-community, moderation, reporting, participation, or conduct expectations.
- Keep [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) aligned when privacy, security, data-contract, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc expectations change; run `npm run security:privacy` after security/privacy-sensitive changes.
- Keep dependency license changes intentional; explain new licenses before updating the allowlist.
- Keep dependency changes passing Dependency Review before merge.
- Keep durable UI patterns documented in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) instead of adding one-off styles.
- Keep workflow action refs pinned to full commit SHAs, document the source version tag in a comment, and keep workflow token permissions least-privilege.
- Run `npm run ops:repository` after branch protection, repository security, Pages, required-check, or workflow-activation changes.
- Keep [docs/OPERATIONS.md](docs/OPERATIONS.md) aligned when release-health signals, post-release verification, incident triggers, triage flow, rollback expectations, evidence handling, observability boundaries, monitoring, telemetry, or support expectations change; run `npm run operations:check` after operations-sensitive changes.
- Keep [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) aligned when changing production visibility, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA metrics, support expectations, or production signal ownership; run `npm run observability:check` after observability-sensitive changes.
- Keep [docs/RELEASE_SAFETY.md](docs/RELEASE_SAFETY.md) aligned when changing release safety, deployment, staging, canary, progressive rollout, rollback, provenance, SBOM, signing, artifact, Pages, workflow, operations, observability, security, privacy, legal, or backend-readiness expectations; run `npm run release:safety` after release-safety-sensitive changes.
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
