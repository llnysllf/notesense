# Release Guide

NoteSense currently releases from `main` to GitHub Pages. The release process is intentionally lightweight, but every release should leave clear evidence that the app is safe to use and easy to maintain.

## Release Principles

- Prefer small releases with one clear product or engineering purpose.
- Keep learner-facing behavior intentional and documented.
- Preserve the local-first data model unless a migration plan exists.
- Treat architecture-boundary results as release evidence when shared contracts, practice logic, storage, hooks, components, or app-shell responsibilities change.
- Treat data-contract results as release evidence when storage keys, export schema, import normalization, privacy boundaries, or future sync assumptions change.
- Treat privacy and data-handling docs as release evidence when storage, import/export, analytics, network, account, or sync behavior changes.
- Treat threat-model and backend-readiness docs as release evidence before auth, API, database, sync, PostgreSQL, or cloud infrastructure changes.
- Treat repository hygiene results as release evidence when root configuration, ignore policy, runtime configuration, or generated artifact handling changes.
- Treat documentation integrity results as release evidence when docs, file paths, anchors, or npm scripts change.
- Treat design-system results as UI release evidence when tokens, component states, responsive behavior, typography, or visual-regression coverage changes.
- Treat runtime surface results as release evidence when client APIs, URLs, analytics, network, auth, or sync behavior changes.
- Keep the pinned Node/npm runtime consistent across local setup, CI, deployment, and dependency maintenance.
- Treat lockfile supply-chain results as release evidence when dependencies, lockfiles, Node, or npm runtime settings change.
- Treat dependency license results as supply-chain release evidence.
- Treat Dependency Review results as pull-request supply-chain release evidence when dependencies or lockfiles change.
- Treat workflow action pinning, token-permission, timeout, concurrency, and artifact-retention results as supply-chain and operations release evidence when GitHub Actions workflows change.
- Treat repository governance results as operational release evidence when branch protection, required checks, repository security settings, Pages, or workflow activation changes.
- Treat operations docs as release evidence when release-health signals, incident response, deployment ownership, monitoring, telemetry, or support expectations change.
- Treat release notes as release evidence when user-visible behavior, architecture boundaries, quality gates, dependencies, security posture, operations, or package version metadata change.
- Treat dependency audit and CodeQL results as release evidence.
- Treat built browser security policy results as release evidence when HTML shell, Vite build, runtime APIs, or asset categories change.
- Treat bundle budget results as performance release evidence.
- Treat Lighthouse results as deploy-shape performance, accessibility, best-practice, and SEO release evidence.
- Treat visual-regression results as UI release evidence when layout, color, spacing, typography, screenshots, or component appearance changes.
- Treat web metadata results as static product identity release evidence.
- Treat live deployment verification as public-release evidence for deployed HTML, metadata assets, static app assets, service worker, Workbox runtime, and security policy.
- Treat the Pages smoke test as deployment-base release evidence.
- Treat accessibility, import/export, persistence, and deployment changes as release risks.
- Do not ship generated files such as `dist`, `playwright-report`, or `test-results`.

## Pre-Release Checklist

Run the full local verification gate:

```bash
npm run verify
```

Review the diff:

```bash
git status --short
git diff --check
```

Confirm policy docs and documentation integrity remain aligned:

```bash
npm run repo:hygiene
npm run docs:check
npm run release:notes
```

Confirm the built client stays inside the expected runtime surface:

```bash
npm run build:pages
npm run security:policy
npm run pwa:check
npm run runtime:check
```

For UI changes, manually inspect:

- Desktop layout.
- Mobile layout.
- Keyboard-only navigation.
- Focus visibility.
- Text wrapping.
- Reduced-motion behavior when animation changes.
- Whether `npm run design:check` passes when tokens, layout, component states, or visual-regression coverage change.
- Whether `npm run test:e2e:visual` passes or baselines were intentionally updated and reviewed.

For data changes, manually inspect:

- Existing local progress loads without reset.
- Exported data includes the expected schema version.
- Imported data is normalized or rejected safely.
- Storage failures stay non-blocking.
- Whether `npm run data:check` still proves storage keys, export schema, import normalization, privacy docs, and browser coverage are aligned.
- Whether `npm run architecture:check` still proves source responsibilities stay in the expected layers.
- Whether `npm run docs:check` passes.
- Whether `npm run runtime:check` passes after a Pages build.
- Whether `docs/PRIVACY.md` still reflects storage keys, export contents, tracking behavior, and future migration expectations.
- Whether `docs/THREAT_MODEL.md` and `docs/BACKEND_READINESS.md` still reflect future account, sync, API, database, and cloud boundaries.

For dependency changes, inspect:

- Whether the update is a routine minor/patch update or a deliberate major upgrade.
- Peer dependency warnings from `npm ci`.
- Whether the `Dependency Review` workflow passed on the pull request.
- Whether `npm run compliance:licenses` still passes.
- Whether `npm run security:lockfile` still passes.
- Whether `npm run security:workflows` still passes after workflow changes.
- Whether workflow artifact retention remains short enough for debugging without keeping browser traces longer than needed.
- Whether `npm run ops:repository` still passes after branch protection, required-check, repository security, Pages, or workflow-activation changes.
- Whether any new license needs explicit policy review.
- Whether `.nvmrc`, package engines, GitHub Actions, and docs stay aligned for runtime changes.
- Whether `CHANGELOG.md` explains release-relevant dependency, runtime, or tooling changes.
- Whether `npm run security:policy` still passes after the Pages build.
- Browser test behavior after Playwright, Vite, Vitest, ESLint, or TypeScript updates.

For bundle changes, inspect:

- Whether `npm run perf:budget` passes after the Pages build.
- Whether raw or gzip growth is expected for the change.
- Whether a budget increase is justified by product value.
- Whether the `Lighthouse` workflow still passes or produces only understood warnings.

For PWA/offline changes, inspect:

- Whether the generated service worker still precaches only reviewed static assets.
- Whether `npm run pwa:check` passes after the Pages build.
- Whether the Content Security Policy still allows only the intended self-hosted worker behavior.
- Whether `npm run deploy:verify-live` still proves the deployed service worker and Workbox runtime after release.
- Whether Lighthouse performance, accessibility, best-practice, and SEO results remain understood and tracked.

For web metadata changes, inspect:

- Whether `npm run metadata:check` passes after the Pages build.
- Whether canonical, manifest, robots, and sitemap URLs still match the deployed location.
- Whether icon and manifest paths work from `/notesense/`.

For deployment-path changes, inspect:

- Whether `npm run test:e2e:pages` passes.
- Whether the app loads from `/notesense/`.
- Whether built assets and metadata are requested from `/notesense/`.

## Push And Deployment

Push to `main` only after the local gate passes.

Before cutting a release, move relevant `[Unreleased]` entries in `CHANGELOG.md` into a dated version section that matches `package.json`.

After pushing:

- Confirm the `CI` workflow succeeds.
- Confirm the `Dependency Review` workflow succeeds when dependency or lockfile changes are in a pull request.
- Confirm the `Visual Regression` workflow succeeds when UI, CSS, screenshots, browser, or Playwright behavior changes.
- Confirm the `CodeQL` workflow succeeds when it runs for the change.
- Confirm the `Deploy Pages` workflow succeeds.
- Confirm the `Lighthouse` workflow succeeds when it runs for the change.
- Confirm the live verifier still proves the deployed security policy, service worker, and Workbox runtime when the HTML shell, build security policy, or PWA behavior changes.
- Confirm [OPERATIONS.md](OPERATIONS.md) still reflects release-health, incident-response, rollback, evidence-handling, and observability expectations.
- Run `npm run ops:repository` after repository governance changes.
- Run the live deployment verifier:

```bash
npm run deploy:verify-live
```

## Rollback

If a release breaks the live app:

1. Identify the last known good commit.
2. Revert the risky commit with a normal Git revert.
3. Push the revert to `main`.
4. Confirm `CI`, `CodeQL`, and `Deploy Pages` succeed.
5. Run `npm run deploy:verify-live`.
6. Document the cause before attempting a fix-forward.

Avoid force-pushing `main`; the deployment history should remain auditable.
