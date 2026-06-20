# Security And Privacy Contract

NoteSense is local-first today. This contract keeps privacy, security, runtime, import/export, PWA, and future backend expectations aligned before account, sync, analytics, or hosted storage work begins.

Legal and licensing expectations live in [LEGAL.md](LEGAL.md).

Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).

Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).

Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).

## Product Standard

- The practice loop must remain usable without an account, backend API, analytics service, or hosted storage.
- Practice progress, settings, session history, imports, and exports are user-private local data unless a future reviewed backend design says otherwise.
- Privacy-impacting behavior should be explicit in docs, tests, release evidence, and PR review before it ships.
- Security-sensitive changes include import parsing, export shape, LocalStorage migration, runtime/network surface, service-worker behavior, dependency supply chain, workflow policy, future auth, future sync, and future backend boundaries.

## Current Protected Surface

- `docs/PRIVACY.md` owns the local-first privacy and data-handling boundary.
- `SECURITY.md` owns vulnerability reporting and security expectations for the supported version.
- `docs/THREAT_MODEL.md` owns current threats, controls, future auth/sync risks, and backend preconditions.
- `docs/BACKEND_READINESS.md` owns the future service boundary, API/backend shape, secrets rules, and backend launch checklist.
- `docs/DATA_CONTRACT.md` owns LocalStorage keys, export schema, import normalization, and future sync constraints.

## Runtime And Build Boundaries

- `npm run runtime:check` rejects unreviewed client network APIs, cookies, telemetry beacons, websockets, event streams, worker script imports, and unapproved external URLs.
- `npm run security:policy` verifies the built HTML Content Security Policy after `npm run build:pages`.
- `npm run pwa:check` verifies the generated service worker imports only the local Workbox runtime, precaches reviewed static assets, and avoids background sync, push notifications, external URLs, and external worker imports.
- `npm run data:check` verifies storage keys, export schema, import normalization, privacy docs, and browser coverage stay aligned.
- `npm run security:supply-chain` verifies high-severity dependency advisories, lockfile source/integrity, dependency licenses, SPDX SBOM generation, workflow action pinning, workflow permissions, and workflow operations.

## Future Auth And Sync Rules

- Do not connect the browser app directly to PostgreSQL or any other database.
- Future sign-in, cloud sync, backend APIs, analytics, telemetry, or hosted storage must update privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface checks, release guidance, operations guidance, and ADRs together.
- Future telemetry, analytics, monitoring SDKs, remote logging, or error-reporting sinks must follow [OBSERVABILITY.md](OBSERVABILITY.md) before implementation.
- Future product analytics, experiments, surveys, support tooling, feature flags, or delivery metrics must follow [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md) before implementation.
- Future published SBOM, provenance, signing, staging, canary, or automated rollback work must preserve least-privilege workflow identities and avoid exposing user-private practice data.
- Future account data must define authentication, authorization, retention, deletion, export, migration, sync conflict handling, observability, rollback, and incident-response expectations before launch.
- Anonymous local practice should remain a usable baseline unless a product-scope decision explicitly changes that promise.

## Review And Release Evidence

- PRs should call out security/privacy impact for storage, import/export, runtime/network behavior, service-worker behavior, future auth/sync, workflow changes, and dependency changes.
- Release review should include security/privacy evidence when storage keys, export schema, import normalization, runtime APIs, CSP, PWA behavior, dependency posture, future auth, future sync, backend readiness, telemetry, analytics, or network behavior changes.
- Security/privacy changes should keep product scope, data, testing, browser support, performance, operations, release, architecture, and PR review guidance aligned.

## Change Rules

- Run `npm run security:privacy` after privacy, security, data-contract, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc changes.
- Run `npm run build:pages` before `npm run security:policy`, `npm run pwa:check`, and `npm run runtime:check`.
- Run `npm run security:supply-chain` after dependency, lockfile, license, SBOM, workflow, Node, npm, or package-manager changes.
- Run `npm run legal:check` before adding user-facing terms, externally hosted privacy policies, contributor-community terms, production telemetry, analytics, account data, sync data, or backend logs tied to users.
- Add an ADR when a change affects security posture, privacy posture, account data, sync, service boundaries, deployment trust boundaries, or backend readiness.

## Verification

`npm run security:privacy` verifies that:

- this contract keeps product-standard, protected-surface, runtime/build-boundary, future-auth/sync, review/release-evidence, change-rule, and verification sections
- privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface, CSP, PWA, supply-chain, and release gates stay connected
- README, contributing, quality, release, architecture, testing, operations, PR review, ADR, and changelog guidance stay connected to security/privacy readiness
