# Product Learning And Feedback Contract

NoteSense should make product decisions from learner problems and trustworthy evidence, not from feature volume. This contract defines how feedback, future analytics, experiments, feature flags, and delivery metrics should be handled while the app remains local-first.

## Product Standard

- Product decisions should connect to a clear learner problem, quality signal, or operational risk.
- The project should learn from real usage without weakening the local-first privacy promise.
- Feedback loops should improve scope discipline, accessibility, reliability, and learning value before they add feature complexity.
- Product learning should stay explainable in issues, pull requests, release notes, ADRs, and incident reviews.

## Current Learning Boundary

- The current app has no product analytics, experimentation platform, feature flag service, A/B testing, in-app survey, support CRM, or DORA dashboard.
- Current product learning comes from GitHub issues, pull-request review, manual learner testing, release evidence, incident reviews, and owner notes.
- Local practice history and in-app charts are learner-owned product features, not production analytics sent to the project owner.
- This no-analytics boundary is acceptable while NoteSense remains a local-first portfolio product with no account system, paid usage, formal support, classroom commitment, or hosted sync.

## Feedback And Decision Inputs

- Bugs should describe the affected learner workflow, expected behavior, actual behavior, reproduction steps, browser or viewport context, and evidence.
- Product proposals should start with the learner problem, smallest useful version, success signal, privacy impact, accessibility impact, testing impact, release risk, and operational impact.
- Foundation work should explain what future product risk it reduces.
- Incident reviews should feed back into product, release, testing, observability, and operations docs when they reveal a missing signal or brittle workflow.

## Future Analytics Experiments And Feature Flags

- Do not add product analytics, A/B testing, remote feature flags, in-app surveys, session replay, or usage tracking without updating privacy, security, legal, observability, release, operations, product-scope, data, runtime-surface, and ADR guidance first.
- Any future product analytics event must document its purpose, allowed fields, denied fields, retention, sampling, user notice, deletion path, provider ownership, and review owner.
- Denied product-learning data includes practice answers, note-level progress, session history, imported/exported JSON contents, raw LocalStorage, audio recordings, keystrokes, precise location, and stable cross-site identifiers.
- Feature flags are allowed first as static or local development controls for release safety, not as hidden production experiments.
- Remote configuration, experimentation platforms, or staged rollout systems should be introduced only with release-safety, observability, privacy, legal, and runtime-surface review.

## Delivery Metrics And Review Cadence

- DORA-style metrics such as lead time, deployment frequency, change-failure rate, and MTTR should be introduced only after there is enough production release history to make them meaningful.
- Delivery metrics should be used to improve reliability and flow, not to reward larger changes or rushed releases.
- Product-learning reviews should inspect whether shipped work improved the learner problem it claimed to address.
- When real users depend on the product, review product feedback, incident follow-ups, release evidence, and delivery metrics on a regular cadence.

## Change Rules

- Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, product-scope, observability, privacy, legal, runtime-surface, release, or operations changes.
- Keep product scope, review/intake, observability, release safety, operations, security/privacy, legal, data, testing, backend-readiness, ADR, changelog, and PR review guidance aligned when product-learning expectations change.
- Do not treat future analytics, experiments, or feature flags as implementation details; they are product, privacy, release, and operations decisions.

## Verification

`npm run product:learning` verifies that:

- this product-learning contract keeps product-standard, current-boundary, feedback-input, future-analytics, delivery-metric, change-rule, and verification sections
- package scripts include the product-learning contract in the local foundation gate
- README, contributing, quality, release, operations, observability, security/privacy, legal, data, backend-readiness, architecture, testing, ADR, changelog, and PR review guidance stay connected to product feedback, future analytics, experiments, feature flags, and delivery metrics
