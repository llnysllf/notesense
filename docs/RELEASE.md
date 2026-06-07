# Release Guide

NoteSense currently releases from `main` to GitHub Pages. The release process is intentionally lightweight, but every release should leave clear evidence that the app is safe to use and easy to maintain.

## Release Principles

- Prefer small releases with one clear product or engineering purpose.
- Keep learner-facing behavior intentional and documented.
- Preserve the local-first data model unless a migration plan exists.
- Keep the pinned Node/npm runtime consistent across local setup, CI, deployment, and dependency maintenance.
- Treat dependency license results as supply-chain release evidence.
- Treat dependency audit and CodeQL results as release evidence.
- Treat bundle budget results as performance release evidence.
- Treat web metadata results as static product identity release evidence.
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

For UI changes, manually inspect:

- Desktop layout.
- Mobile layout.
- Keyboard-only navigation.
- Focus visibility.
- Text wrapping.
- Reduced-motion behavior when animation changes.

For data changes, manually inspect:

- Existing local progress loads without reset.
- Exported data includes the expected schema version.
- Imported data is normalized or rejected safely.
- Storage failures stay non-blocking.

For dependency changes, inspect:

- Whether the update is a routine minor/patch update or a deliberate major upgrade.
- Peer dependency warnings from `npm ci`.
- Whether `npm run compliance:licenses` still passes.
- Whether any new license needs explicit policy review.
- Whether `.nvmrc`, package engines, GitHub Actions, and docs stay aligned for runtime changes.
- Browser test behavior after Playwright, Vite, Vitest, ESLint, or TypeScript updates.

For bundle changes, inspect:

- Whether `npm run perf:budget` passes after the Pages build.
- Whether raw or gzip growth is expected for the change.
- Whether a budget increase is justified by product value.

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

After pushing:

- Confirm the `CI` workflow succeeds.
- Confirm the `CodeQL` workflow succeeds when it runs for the change.
- Confirm the `Deploy Pages` workflow succeeds.
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
