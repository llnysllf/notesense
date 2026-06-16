# Support Policy

NoteSense is a local-first portfolio product. Support is intentionally lightweight today, but reports should still arrive through clear, privacy-respecting paths.

## Supported Surface

- The supported version is the `main` branch deployed to GitHub Pages.
- The app stores practice data in the learner's browser and does not have hosted accounts, a backend API, telemetry, analytics, or a formal support queue.
- There is no public SLA or guaranteed response time for support requests.

## Where To Ask

- Use the [bug report template](ISSUE_TEMPLATE/bug_report.yml) for broken, confusing, inaccessible, or unreliable behavior.
- Use the [product proposal template](ISSUE_TEMPLATE/feature_proposal.yml) for new learner-facing ideas.
- Use the [engineering task template](ISSUE_TEMPLATE/engineering_task.yml) for foundation, tooling, documentation, release, or maintainability work.
- Follow [SECURITY.md](../SECURITY.md) for vulnerabilities or security-sensitive reports. Do not post exploit details publicly.

## Privacy And Data

- Do not attach private LocalStorage exports, imported files, raw practice history, credentials, `.env` files, or screenshots that expose private data.
- If exported practice data is needed to reproduce an issue, sanitize it first or describe the shape of the problem instead.
- Future support tooling, telemetry, analytics, or remote logging must follow [docs/PRIVACY.md](../docs/PRIVACY.md), [docs/SECURITY_PRIVACY.md](../docs/SECURITY_PRIVACY.md), and [docs/OBSERVABILITY.md](../docs/OBSERVABILITY.md) before implementation.

## Incident And Release Signals

- Release-health and incident-response expectations live in [docs/OPERATIONS.md](../docs/OPERATIONS.md).
- Production visibility and incident-learning expectations live in [docs/OBSERVABILITY.md](../docs/OBSERVABILITY.md).
- Current operational signals are GitHub Actions, live deployment verification, repository governance checks, and user reports.

## Change Rules

- Update this policy when support channels, response expectations, issue intake, security routing, privacy boundaries, telemetry, analytics, or formal support commitments change.
- Keep [docs/REVIEW_PROCESS.md](../docs/REVIEW_PROCESS.md), [docs/OPERATIONS.md](../docs/OPERATIONS.md), [docs/OBSERVABILITY.md](../docs/OBSERVABILITY.md), and [SECURITY.md](../SECURITY.md) aligned when support expectations change.
- Run `npm run review:check` after support-policy, intake, issue-template, security-routing, or triage-process changes.
