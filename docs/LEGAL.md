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

## Public Marketing Surface

- The public site makes claims about the product to people who have not used it, so its claims are generated from the shipped route table and validated by `validateMarketingPages` rather than written as free copy.
- There is no pricing page, because there is no commercial offer, and no sign-in page, because there are no accounts. Adding either requires adding the thing it describes first, and updating this contract, [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md), and the user-facing legal surface above in the same change.
- The site collects nothing. There is no waitlist, no email capture, no form that leaves the device, and no conversion measurement. Adding any of them means a network request, a widened content policy, an externally hosted privacy policy, and owner approval before implementation.
- The public Terms page records the simple boundary for the current local tool. It is not an account, payment, subscription, upload, or support contract; add formal Terms of Service before any of those surfaces ship.

## Community Conduct

- The root [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) file defines expected behavior for issues, pull requests, reviews, and project-managed discussion.
- The repository remains owner-maintained unless a future governance change explicitly defines external maintainer roles, support commitments, or moderation coverage.
- The Code of Conduct does not change project license terms, grant source-code rights, or replace security/privacy reporting guidance.
- Conduct reports that include private information, safety risk, abuse, security, or privacy impact should follow the private contact path in [../SECURITY.md](../SECURITY.md).
- Future external contributor programs, public community spaces, support queues, or maintainer-role changes must update this contract, the Code of Conduct, contributing guidance, review guidance, and release guidance together.

## Dependency License Boundary

- Dependency license compliance covers installed third-party packages, not the license for NoteSense's own source code.
- New dependency licenses should be reviewed through [DEPENDENCY_MAINTENANCE.md](DEPENDENCY_MAINTENANCE.md).
- Do not use dependency license allowlists as a substitute for the root project license.

## Bundled Audio Assets

- Sound worlds are content, not code: a sampled instrument is somebody's recording, and shipping one is a licensing decision, not an implementation detail.
- Every sound world declares a licence and an attribution in its manifest, and `validateSoundWorld` in `shared/src/sound/soundWorld.ts` rejects any licence outside `ALLOWED_ASSET_LICENSES` (CC0-1.0, CC-BY-4.0, Apache-2.0, MIT, public-domain). An unknown licence fails rather than being assumed acceptable.
- Everything shipped today is synthesized in the browser from a voice definition, is public-domain, and downloads nothing. The manifest, cache policy, and fallback exist so a sampled pack can be added deliberately, not so one can arrive by accident.
- Adding a downloadable pack requires owner approval covering its licence, its attribution text, its size against the download budget in [PERFORMANCE.md](PERFORMANCE.md), and its effect on the runtime surface — a pack means a network request the app does not currently make.
- Asset licence review is separate from dependency licence review: `npm run compliance:licenses` covers installed packages and says nothing about bundled audio.

## Change Rules

- Run `npm run legal:check` after changing the root license, package license metadata, legal docs, user-facing terms, privacy-policy hosting, contributor community expectations, code-of-conduct expectations, dependency license policy, release guidance, or PR review guidance.
- Owner approval is required before changing the project from all-rights-reserved terms to an open-source license.
- Owner approval is also required before adding a bundled or downloadable audio asset, and the allowed asset licence list must be updated in the same change as the asset.
- Keep README, contributing, quality, release, architecture, dependency-maintenance, security/privacy, ADR, changelog, and PR review guidance aligned when legal or licensing expectations change.

## Verification

`npm run legal:check` verifies that:

- the root project license exists and keeps the all-rights-reserved permission boundary explicit
- package metadata stays private and unlicensed for npm distribution
- legal docs keep project-license, user-facing legal, dependency-license, change-rule, and verification sections
- legal docs keep community-conduct expectations connected to contribution, reporting, security/privacy, release, and review guidance
- dependency license checks remain separate from the project license
- README, contributing, quality, release, architecture, testing, dependency-maintenance, security/privacy, ADR, changelog, and PR review guidance stay connected to legal and licensing expectations
