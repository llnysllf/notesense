# Operations Runbook

NoteSense is currently a static, local-first app deployed to GitHub Pages. Operations are intentionally lightweight, but release health, incident response, and future service readiness should be explicit before the product grows into accounts or sync.

## Supported Surface

- The supported production surface is the `main` branch deployed to GitHub Pages at `https://llnysllf.github.io/notesense/`.
- The app stores practice progress and settings in the learner's browser. There is no hosted account, backend API, database, analytics service, or support queue yet.
- GitHub Actions, repository governance checks, live deployment verification, and user-reported issues are the current operational signal.
- Do not add telemetry, monitoring SDKs, backend APIs, or third-party services without updating privacy, security, runtime-surface, release, threat-model, backend-readiness, and operations docs together.

## Health Signals

Treat these as the current release-health evidence:

- `CI` / Quality gate: local quality contract, unit tests, coverage, and browser workflows.
- `Visual Regression`: protected app shells across desktop/mobile and light/dark themes.
- `Lighthouse`: deployment-shaped performance, accessibility, best-practice, SEO, and PWA signal.
- `CodeQL`: JavaScript and TypeScript security analysis.
- `Dependency Review`: pull-request dependency vulnerability and license drift.
- `Deploy Pages`: GitHub Pages artifact publication.
- `npm run deploy:verify-live`: public app shell, metadata assets, service worker, Workbox runtime, and Content Security Policy.
- `npm run ops:repository`: branch protection, required checks, Pages, repository security settings, Dependabot security updates, vulnerability alerts, and active workflows.

## Post-Release Verification

After `main` deploys:

1. Confirm the `Deploy Pages` workflow succeeded.
2. Run `npm run deploy:verify-live`.
3. Confirm Lighthouse is green or that warnings are understood and recorded.
4. Confirm repository governance with `npm run ops:repository` after branch protection, required-check, repository security, Pages, or workflow-activation changes.
5. Check the live app manually when the change affects UI, PWA behavior, routing, metadata, import/export, or storage.

## Incident Triggers

Open an engineering task or bug report when any of these happen:

- The live app returns a non-200 response, loads a blank surface, or fails to start a drill.
- `npm run deploy:verify-live` fails after a release.
- Required GitHub checks fail on `main`.
- The service worker, Workbox runtime, metadata, or Content Security Policy no longer matches the documented static-app boundary.
- Import/export, LocalStorage migration, or storage-failure handling regresses.
- A high or critical dependency advisory affects the deployed app.
- A privacy, security, or data-handling assumption in `docs/PRIVACY.md`, `docs/THREAT_MODEL.md`, or `docs/BACKEND_READINESS.md` becomes false.

## Triage Flow

1. Preserve evidence: failing command output, GitHub Actions links, browser console output, screenshots, and the relevant commit SHA.
2. Classify the issue as deployment, source behavior, dependency/security, repository governance, browser-specific, or documentation/process drift.
3. Freeze unrelated merges until the production status is understood.
4. Reproduce locally with the closest matching command: `npm run verify`, `npm run test:e2e:pages`, `npm run test:e2e:visual`, `npm run build:pages`, or `npm run deploy:verify-live`.
5. Decide rollback or fix-forward based on user impact and confidence.
6. Document the cause and prevention before closing the issue.

## Rollback And Fix-Forward

- Prefer a normal Git revert of the risky commit. Do not force-push `main`.
- After reverting or fixing forward, confirm `CI`, `CodeQL`, `Deploy Pages`, and relevant specialized workflows pass.
- Run `npm run deploy:verify-live` after the corrected deployment.
- Update the release guide, operations runbook, ADRs, or quality gates when the incident exposes a process gap.

## Current Observability Boundary

The current app intentionally has no analytics, telemetry, remote logging, or account data. Operational visibility comes from deterministic release checks, public deployment verification, GitHub Actions, and user reports.

Before shipping accounts, sync, APIs, or managed storage, add an observability plan that covers:

- client error reporting that avoids practice-data leakage
- API availability, latency, error-rate, and auth-failure metrics
- structured server logs with request correlation
- alerting thresholds and escalation notes
- data export/deletion workflow monitoring
- rollback and migration monitoring for schema changes

## Artifact And Evidence Handling

- Keep workflow artifacts short-lived and scoped to debugging.
- Do not upload LocalStorage exports, private user data, `.env` files, credentials, or generated reports that include secrets.
- Keep incident notes factual: symptom, impact, commit range, evidence, root cause, fix, and prevention.

## Review Cadence

- Review this runbook when release, deployment, PWA, repository-governance, security, privacy, backend-readiness, or observability assumptions change.
- Review it before adding sign-in, sync, cloud storage, analytics, monitoring, or any backend service.
- Keep `docs/RELEASE.md`, `docs/QUALITY.md`, and this runbook aligned so release evidence and incident response stay consistent.
