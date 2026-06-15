# Threat Model

Last reviewed: 2026-06-15

NoteSense is currently a static, local-first app. This model documents the security boundaries that exist today and the work required before future sign-in, sync, API, PostgreSQL, or cloud infrastructure changes.

Security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).

## Current Scope

- Static React app served from GitHub Pages.
- Browser-only practice loop with Web Audio playback.
- LocalStorage progress and settings.
- User-triggered JSON import/export.
- Generated service worker that precaches reviewed static assets only.
- No account system.
- No backend API.
- No server-side database.
- No analytics, telemetry, advertising, cookies, or third-party scripts.

## Data Classification

| Data                       | Current Location                      | Sensitivity                  | Notes                                                                           |
| -------------------------- | ------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Static app assets          | GitHub Pages and service worker cache | Public                       | HTML, JS, CSS, icon, manifest, robots, sitemap, service worker, Workbox runtime |
| Practice progress          | Browser LocalStorage                  | User-private local data      | Includes attempts, correctness, best scores, and session history                |
| Practice settings          | Browser LocalStorage                  | User-private local data      | Includes round length, reading range, and practice preferences                  |
| Exported JSON              | User-selected download location       | User-controlled private data | Can be shared or stored outside the browser by the user                         |
| Imported JSON              | User-selected local file              | Untrusted input              | Must be parsed and normalized defensively                                       |
| Future account identity    | Not implemented                       | Sensitive personal data      | Requires explicit auth, retention, deletion, and migration design               |
| Future cloud practice data | Not implemented                       | Sensitive user data          | Requires backend authorization, sync, backups, and deletion workflows           |

## Trust Boundaries

1. Browser UI to LocalStorage.
2. Browser UI to generated service worker cache.
3. User-selected import file to import parser.
4. GitHub Pages static hosting to browser runtime.
5. Future browser app to backend API.
6. Future backend API to database.
7. Future backend API to auth provider.
8. Future backend/service logs to operators.

## Current Threats And Controls

| Threat                                            | Current Control                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Malformed import file corrupts progress           | Versioned import schema, JSON parsing guard, normalization, unsupported-version rejection          |
| Import file injects executable content            | React renders data as text, import normalization keeps data structural, CSP blocks inline scripts  |
| LocalStorage unavailable or full                  | Save failures return false and show non-blocking status                                            |
| Accidental network, cookie, or telemetry behavior | Runtime-surface gate blocks unreviewed fetch, XHR, beacons, websockets, cookies, and external URLs |
| Service worker caches private practice data       | Generated PWA checker and live verifier restrict service worker behavior to reviewed static assets |
| Third-party script or asset drift                 | CSP, runtime-surface checks, metadata checks, and bundle checks restrict deployed surface          |
| Dependency supply-chain risk                      | npm audit, license gate, Dependabot, lockfile install, and CodeQL                                  |
| Blank app after render failure                    | App-level error boundary and resilience browser test                                               |

## Future Auth And Sync Risks

Future account or cloud sync work must address:

- Authentication provider trust model.
- Session storage strategy and token lifetime.
- Account creation, login, logout, and recovery.
- Authorization on every user-owned practice-data endpoint.
- CSRF strategy if cookies are used.
- CORS strategy if token-based APIs are used.
- Rate limiting and abuse protection.
- Data export and deletion.
- Local anonymous data migration into an account.
- Conflict resolution across devices.
- Auditability for profile, settings, and sync changes.
- Error reporting without collecting unnecessary practice content.
- Retention and backup expectations.

## Required Before Backend Work Ships

- Architecture ADR for auth, API, database, sync, and hosting choices.
- API contract for profile, settings, sessions, progress export, and sync.
- Database schema or access pattern review.
- Secret-management plan.
- Client privacy doc update explaining what leaves the browser and why.
- Security tests for import, auth, authorization, sync, and migration.
- Observability plan for API errors, latency, and release health, aligned with [OPERATIONS.md](OPERATIONS.md).
- Rollback plan for database and API migrations.

## Explicit Non-Goals Today

The browser app must never connect directly to PostgreSQL or any other database.

- No direct browser connection to PostgreSQL or any database.
- No background sync.
- No push notifications.
- No analytics or telemetry.
- No server-side storage of practice progress.
- No microphone recording.
