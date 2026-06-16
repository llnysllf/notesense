# Observability And Incident Learning Contract

NoteSense should eventually be able to see, react to, and learn from production usage without betraying its local-first privacy promise. This contract defines the current visibility boundary and the rules for adding production error reporting, monitoring, analytics, or delivery metrics later.

Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).

Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).

## Product Standard

- The app should never become blind to production failures once real users depend on it.
- Observability should improve reliability without collecting practice content, imported files, exported files, keystrokes, audio, or unnecessary identifiers.
- Privacy, security, legal, release, operations, and runtime-surface expectations must be updated before any production telemetry or analytics is added.
- Production visibility should help answer whether the app loads, starts practice, recovers from errors, and stays inside its local-first boundary.

## Current Visibility Boundary

- The current app has no production telemetry, analytics, real-user monitoring, remote logging, or support queue.
- Current release-health signals are GitHub Actions, Lighthouse, visual regression, Dependency Review, CodeQL, Pages deployment, `npm run deploy:verify-live`, `npm run ops:repository`, and user reports.
- Support expectations and non-SLA boundaries live in [../.github/SUPPORT.md](../.github/SUPPORT.md).
- `src/components/ErrorBoundary.tsx` provides a learner-facing recovery surface and logs render failures to the browser console for development and future client-side error reporting.
- The current operations model is intentionally no-telemetry; this is acceptable while the app is a local-first portfolio product with no hosted accounts or paid service.
- This boundary becomes insufficient before hosted accounts, sync, paid usage, formal support, public classrooms, or other real-user operating commitments.

## Future Signal Rules

- Client error reporting must be privacy reviewed before implementation.
- Any future telemetry sink must document allowed fields, denied fields, retention, sampling, provider ownership, opt-in or notice requirements, deletion workflow, and incident access rules.
- Allowed future signals may include app version, release SHA, page load status, route shape, browser family, viewport class, error class, stack fingerprint, service-worker version, and coarse timing.
- Denied future signals include practice answers, note-level progress, session history, imported/exported JSON contents, raw LocalStorage, audio recordings, keystrokes, precise IP-derived location, full URLs with query strings, and stable cross-site identifiers.
- Analytics or product-usage events require a separate product-learning and privacy decision before implementation.
- Runtime surface checks, Content Security Policy, privacy docs, legal docs, release docs, operations docs, threat model, backend readiness, and ADRs must move together when any telemetry, analytics, monitoring SDK, or external endpoint is introduced.

## Incident Learning

- User-impacting production incidents should leave an incident review using [POSTMORTEM_TEMPLATE.md](POSTMORTEM_TEMPLATE.md).
- Severity should be classified by user impact:
  - SEV0: live app unavailable, blank, unsafe, or unable to start practice for most users.
  - SEV1: core practice, persistence, import/export, deployment, privacy, or security behavior is broken for a meaningful user segment.
  - SEV2: degraded but recoverable UX, browser-specific failure, metadata/PWA issue, or documentation/process drift that could affect release confidence.
  - SEV3: low-impact process, monitoring, documentation, or follow-up improvement.
- Incident reviews should capture timeline, detection source, impact, root cause, resolution, prevention, evidence links, and follow-up owners.
- Release evidence should connect incident timelines to commit SHAs, deployment runs, Pages artifacts, and live verification results.
- DORA-style metrics such as lead time, deployment frequency, change-failure rate, and MTTR should be introduced only after the release process has enough real production history to make those metrics meaningful.

## SLO And SLA Boundary

- NoteSense does not currently promise an external SLA.
- The internal reliability objective is that the GitHub Pages app loads from `/notesense/`, preserves the local-first practice loop, and can start a drill after release.
- A public SLA, support target, uptime target, or classroom/customer commitment requires user-facing terms, support ownership, monitoring, alerting, and incident-response updates first.
- Future SLOs should be measurable from approved privacy-respecting signals and should not require collecting learner practice data.

## Change Rules

- Run `npm run observability:check` after observability, monitoring, telemetry, analytics, incident-response, postmortem-template, SLO/SLA, DORA-metric, support, support-policy, operations, privacy, security, legal, runtime-surface, release, or backend-readiness changes.
- Do not add telemetry, analytics, monitoring SDKs, remote logging, or external error-reporting endpoints without updating this contract first.
- Keep operations, security/privacy, legal, release, quality, architecture, testing, backend-readiness, threat-model, ADR, changelog, and PR review guidance aligned when observability expectations change.

## Verification

`npm run observability:check` verifies that:

- this contract keeps product-standard, current-visibility-boundary, future-signal-rule, incident-learning, SLO/SLA-boundary, change-rule, and verification sections
- the incident review template keeps timeline, impact, root-cause, resolution, prevention, evidence, and follow-up fields
- package scripts include the observability contract in the local foundation gate
- README, contributing, quality, release, operations, security/privacy, legal, architecture, testing, backend-readiness, threat-model, ADR, changelog, and PR review guidance stay connected to production visibility and incident learning
