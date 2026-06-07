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
- User workflows have browser coverage when UI, persistence, import/export, or accessibility-sensitive behavior changes.
- High and critical npm advisories are absent or explicitly handled.
- Dependency licenses pass the lockfile compliance policy.
- Static bundle output stays within the documented performance budgets.
- Intentional render-failure recovery stays covered by the runtime resilience browser test.
- The GitHub Pages build loads from `/notesense/` and starts a drill in the Pages smoke test.
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

For visual QA:

- Start the app with `npm run dev`.
- Check the primary practice path.
- Check the progress panel after at least one saved round.
- Check mobile width for text wrapping, button sizing, and horizontal overflow.
- Confirm `dist/index.html` uses `/notesense/` asset paths after `npm run build:pages`.
- Confirm bundle growth is intentional when `npm run perf:budget` changes or fails.
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

## Data And Persistence Checklist

When touching progress, settings, history, import, or export:

- Add defaults for older local data.
- Normalize untrusted imported values.
- Keep export schemas versioned.
- Preserve a path for anonymous local users to migrate into a future account.
- Surface storage failures without crashing the practice loop.

## Release Checklist

Before pushing to `main`:

- `npm run verify`
- Review the diff for unrelated churn.
- Confirm generated folders such as `dist`, `playwright-report`, and `test-results` remain untracked.

After pushing:

- Confirm the `CI` workflow succeeds.
- Confirm the `CodeQL` workflow succeeds for changes that affect source, workflows, or security-sensitive paths.
- Confirm the `Deploy Pages` workflow succeeds.
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
- CodeQL scans JavaScript and TypeScript on pushes, pull requests, and a weekly schedule.
- Import/export parsing, storage migration, future auth, future sync, and future backend boundaries should be treated as security-sensitive areas.

## Performance Budget

- `npm run perf:budget` checks raw and gzip sizes for built JavaScript, CSS, and HTML.
- The budget runs after `npm run build:pages` inside `npm run verify`.
- Budget increases should be intentional, reviewed, and documented in the same change that needs them.

## Deployment Smoke

- `npm run test:e2e:pages` verifies the Pages build at `/notesense/`.
- The smoke test fails on broken asset requests, browser console errors, page errors, viewport overflow, or inability to start a drill.
- The smoke test is intentionally narrow; full workflow coverage stays in `npm run test:e2e`.
- `npm run deploy:verify-live` checks the public GitHub Pages URL after deployment.

## Runtime Resilience

- `npm run test:e2e:resilience` builds the app in Playwright-only resilience mode and forces a render failure before the practice UI mounts.
- The resilience test verifies an accessible recovery screen instead of a blank app.
- The normal browser suite continues to fail on unexpected console errors and page errors.
