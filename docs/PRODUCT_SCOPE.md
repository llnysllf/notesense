# Product Scope Contract

NoteSense is a focused piano sight-reading and ear-training app for beginner musicians. This contract keeps the product small, coherent, and buildable while the foundation is being strengthened.

Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).

## Product Promise

- Help a learner practice starter note reading and natural-note pitch recognition quickly.
- Keep the practice loop fast, calm, local-first, accessible, and usable without an account.
- Prefer durable quality, testability, privacy, and maintainability over feature volume.
- Avoid adding features only to make the project look larger.

## Current Supported Scope

- Two practice modes: note reading and pitch training.
- Two starter sight-reading clefs: treble and bass.
- Ten starter reading notes across treble and bass.
- Seven natural pitch-training notes from C4 to B4.
- Adaptive or random practice selection.
- Configurable 30, 60, or 90 second rounds.
- Local progress, daily goal, session history, practice insight chart, practice plan coach, and mastery map.
- Local JSON import/export.
- Static GitHub Pages deployment.
- Installable PWA with offline practice after the first load.

## Explicitly Out Of Scope

These are not part of the current supported product surface:

- account sign-in or user profiles
- cloud sync or hosted practice storage
- backend APIs, PostgreSQL, AWS services, or direct database access
- sharps, flats, scales, chords, rhythm drills, MIDI input, or expanded lesson content
- analytics, telemetry, advertising pixels, or third-party tracking
- payments, subscriptions, social sharing, or classroom management

## Foundation-First Rule

Before adding new user-facing features, the change should preserve or improve:

- architecture boundaries
- test ownership and coverage
- accessibility
- design-system consistency
- data/privacy contracts
- security and runtime-surface posture
- release and operations discipline
- documentation and ADR governance

Foundation-only changes are valid when they make the product easier to evolve without expanding the supported learner surface.

## Feature Intake

New features should not start as code. A feature proposal should first explain:

- the learner problem
- why the current scope is insufficient
- the smallest useful version
- data, privacy, accessibility, design, testing, release, and operations impact
- whether the feature changes backend-readiness, threat-model, or product-scope docs
- how the feature can be validated without weakening the existing practice loop

Product proposals should use the product proposal issue template before implementation.

## Change Rules

- Update this contract when current scope, out-of-scope boundaries, feature-intake expectations, or foundation-first rules change.
- Update README current scope when the supported learner surface changes.
- Keep review/intake docs aligned when feature intake changes.
- Update privacy, threat-model, backend-readiness, data-contract, accessibility, design-system, testing, release, and operations docs when scope changes affect their boundaries.
- Add or update ADRs for durable scope changes.
- Run `npm run product:check` after scope, roadmap, feature-intake, or product-positioning changes.
- Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.

## Verification

`npm run product:check` verifies that:

- this product scope contract keeps product promise, current scope, out-of-scope, foundation-first, feature-intake, change-rule, and verification sections
- README current scope keeps the supported surface and explicit non-goals visible
- contributor guidance and PR review keep feature scope and foundation-first expectations visible
- architecture, quality, release, backend-readiness, threat-model, data, privacy, accessibility, testing, operations, and ADR docs stay connected to the current product boundary
