# Legal And Licensing Contract

NoteSense is publicly visible, but visibility is not the same as permission. This contract keeps the project licensing state explicit until the owner intentionally chooses a different distribution model.

Observability and incident-learning expectations live in [OBSERVABILITY.md](OBSERVABILITY.md).

Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).

Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).

## Project License

- The root [LICENSE](../LICENSE) file is the source of truth for project source code and owned assets.
- The current project license is all rights reserved.
- `package.json` uses `license: "UNLICENSED"` and `private: true` so npm metadata does not imply open-source distribution rights.
- Public GitHub visibility is for portfolio review and project evaluation only.
- Third-party dependencies remain governed by their own licenses and are reviewed through `npm run compliance:licenses`.

## User-Facing Legal Surface

- The current app is a static, local-first practice tool with no hosted accounts, paid service, backend API, analytics, telemetry, advertising, or support queue.
- Privacy expectations live in [PRIVACY.md](PRIVACY.md) and security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).
- Add user-facing Terms of Service before shipping hosted accounts, payments, subscriptions, collaboration, public sharing, user-generated cloud content, or a formal support channel.
- Add an externally hosted privacy policy before collecting production telemetry, analytics, account data, sync data, or backend logs tied to users.
- Production telemetry, analytics, monitoring, remote logging, or support commitments must update legal, privacy, and observability expectations together before implementation.
- Product analytics, experiments, surveys, support tooling, session replay, or remote feature flags must update legal, privacy, product-learning, and observability expectations together before implementation.
- SBOMs, signed artifacts, provenance attestations, or externally distributed release packages must preserve the project license boundary before publication.
- Add a `CODE_OF_CONDUCT.md` before treating the repository as an external contributor community rather than an owner-maintained portfolio product.

## Dependency License Boundary

- Dependency license compliance covers installed third-party packages, not the license for NoteSense's own source code.
- New dependency licenses should be reviewed through [DEPENDENCY_MAINTENANCE.md](DEPENDENCY_MAINTENANCE.md).
- Do not use dependency license allowlists as a substitute for the root project license.

## Change Rules

- Run `npm run legal:check` after changing the root license, package license metadata, legal docs, user-facing terms, privacy-policy hosting, contributor community expectations, dependency license policy, release guidance, or PR review guidance.
- Owner approval is required before changing the project from all-rights-reserved terms to an open-source license.
- Keep README, contributing, quality, release, architecture, dependency-maintenance, security/privacy, ADR, changelog, and PR review guidance aligned when legal or licensing expectations change.

## Verification

`npm run legal:check` verifies that:

- the root project license exists and keeps the all-rights-reserved permission boundary explicit
- package metadata stays private and unlicensed for npm distribution
- legal docs keep project-license, user-facing legal, dependency-license, change-rule, and verification sections
- dependency license checks remain separate from the project license
- README, contributing, quality, release, architecture, testing, dependency-maintenance, security/privacy, ADR, changelog, and PR review guidance stay connected to legal and licensing expectations
