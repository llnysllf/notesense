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

For intentional visual changes, refresh and review the screenshot baselines:

```bash
npm run test:e2e:visual:update
```

## Engineering Expectations

- Keep practice logic in pure TypeScript where possible, especially in `src/practiceEngine.ts`.
- Keep persistence and import/export changes behind `src/storage.ts`.
- Add or update tests for new behavior, migrations, accessibility-sensitive UI, and practice analytics.
- Keep dependency license changes intentional; explain new licenses before updating the allowlist.
- Keep workflow action refs pinned to full commit SHAs, document the source version tag in a comment, and keep workflow token permissions least-privilege.
- Keep bundle growth intentional; budget increases need a clear reason in the PR.
- Prefer small, shippable changes with clear user value or clear maintainability value.
- Do not add network services, auth, or cloud storage without preserving the current local-first practice loop.
- Do not add sign-in, sync, PostgreSQL, or AWS services without updating the threat model and backend-readiness docs first.
- Update [docs/PRIVACY.md](docs/PRIVACY.md) when a change affects account data, sync, storage, import/export, analytics, or network behavior.
- Keep runtime changes explicit: update `.nvmrc`, `package.json` engines, GitHub Actions behavior, and ADRs together.
- Record meaningful architecture decisions in `docs/adr` when a change affects data ownership, deployment, quality gates, or future backend boundaries.

## Pull Request Shape

A strong PR includes:

- A short product/engineering summary.
- Confirmation that `npm run verify` passed.
- Screenshots or notes for visual UI changes.
- Updated visual-regression baselines when UI changes intentionally affect the protected shells.
- Any migration, accessibility, deployment, dependency license, security, or data-shape risks.
