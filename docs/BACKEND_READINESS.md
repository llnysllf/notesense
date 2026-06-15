# Backend Readiness

Last reviewed: 2026-06-15

NoteSense should stay local-first until account and sync work has a clear product reason. PostgreSQL, AWS, auth, and APIs belong behind a service boundary, not inside the browser app.

Security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).

Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).

## Current Backend Status

- No backend is deployed.
- No PostgreSQL database is used.
- No auth provider is configured.
- No secrets are required by the frontend.
- `shared/src` owns framework-agnostic import/export, normalization, and merge logic that can be reused by a future backend.

## Core Rule

The browser app must never connect directly to PostgreSQL or any other database.

The future shape should be:

```text
React app -> Backend API -> Database
```

The backend API owns authentication, authorization, validation, rate limiting, database credentials, migrations, and audit logging.

## Recommended Build Order

1. Keep anonymous local practice fully usable.
2. Define the backend architecture ADR.
3. Choose auth provider and session strategy.
4. Define API contracts.
5. Define database schema and migration strategy.
6. Implement a small profile/settings API.
7. Add completed-session upload.
8. Add sync reconciliation.
9. Add account export/delete workflows.
10. Extend the operations runbook with backend observability, rollback, and incident response details.

## Candidate Data Model

| Entity               | Purpose                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| `users`              | Stable account identity from auth provider                                              |
| `practice_settings`  | Per-user round length, reading range, and practice preferences                          |
| `practice_sessions`  | Append-only completed rounds with score, attempts, accuracy, duration, streak, and mode |
| `note_attempts`      | Optional detailed attempt records if future analytics need per-answer history           |
| `progress_snapshots` | Optional materialized summary for fast dashboard loads                                  |
| `sync_events`        | Optional device reconciliation or migration audit trail                                 |

PostgreSQL is a good future fit if NoteSense needs relational history, analytics, exports, deletion workflows, and durable backups. DynamoDB can also work if the product needs simpler key-value/session access at AWS scale. The choice should follow the API and query needs, not the other way around.

## Candidate API Surface

The first backend should stay small:

```text
GET  /v1/me
GET  /v1/settings
PUT  /v1/settings
POST /v1/practice-sessions
GET  /v1/progress
POST /v1/sync
GET  /v1/export
DELETE /v1/account
```

All endpoints must require authorization once accounts exist. Public unauthenticated endpoints should be avoided unless there is a clear product reason.

## Sync Strategy

- Treat completed practice sessions as append-only events where possible.
- Treat settings as last-write-wins with an `updatedAt` timestamp or version.
- Derive progress summaries from sessions and note stats instead of trusting arbitrary client counters.
- Keep local practice fast; sync after rounds rather than blocking answers on network calls.
- Preserve import/export as the migration path for anonymous users.
- Add conflict tests before enabling cross-device sync.

## Secrets And Environments

- Keep frontend builds secret-free.
- Store backend secrets in the hosting provider's secret manager.
- Keep `.env`, `.env.local`, and logs ignored.
- Use separate development, preview, and production environments before handling real account data.
- Do not put database URLs, API secrets, private keys, or auth client secrets in Vite-exposed variables.

## Observability Requirements

Before backend launch, define privacy-safe production signals, incident review ownership, SLO/SLA boundaries, and telemetry retention.

- API error-rate alerting.
- API latency target.
- Auth failure and rate-limit monitoring.
- Structured request logs with request IDs.
- Database migration logs.
- Client error-reporting rules that avoid unnecessary practice-content capture.
- Release rollback steps.
- Updates to [OPERATIONS.md](OPERATIONS.md) for service health signals, incident response, evidence handling, and escalation paths.

## Go/No-Go Checklist For Backend Launch

- `docs/THREAT_MODEL.md` updated.
- `docs/PRIVACY.md` updated.
- Architecture ADR accepted.
- API contract reviewed.
- Database migration path reviewed.
- Auth/session behavior tested.
- Authorization tests cover cross-user access denial.
- Sync conflict tests pass.
- Account export/delete behavior defined.
- Local anonymous mode still works.
- CI, CodeQL, Lighthouse, visual regression, and live deployment checks stay green.
