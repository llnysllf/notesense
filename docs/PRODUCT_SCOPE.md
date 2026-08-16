# Product Scope Contract

NoteSense is a focused piano sight-reading and ear-training app for beginner musicians. This contract keeps the product small, coherent, and buildable while the foundation is being strengthened.

Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).

## Product Promise

- Help a learner practice starter note reading, exact pitch recognition, and pitch-sequence transcription quickly.
- Keep the practice loop fast, calm, local-first, accessible, and usable without an account.
- Prefer durable quality, testability, privacy, and maintainability over feature volume.
- Avoid adding features only to make the project look larger.

## Current Supported Scope

Practice:

- Note reading on treble, bass, and grand staff, in four modes: Learn, Practice, Test, and Custom.
- Pitch training on single notes or three-to-sixteen-note sequences, across natural, chromatic, two-octave, custom, or full 88-key ranges.
- Rhythm drills: generated patterns tapped against a metronome and graded on timing.
- Ear training: intervals, chords, scales, and cadences by ear, plus staff transcription of what was heard.
- Singing: sung phrases analysed in the browser for pitch, steadiness, and timing.
- Songs: self-paced sheet reading from a built-in public-domain song library.
- MIDI import: a local MIDI file mapped into the song model, previewed and saved to the learner's own songs.

Assessment and progress:

- Placement check that suggests a starting point without overriding practice evidence.
- Reading Score: a repeatable timed sight-reading measurement, kept apart from practice evidence.
- Daily plan, mastery map, session history, practice insight chart, and practice plan coach.

Input, sound, and platform:

- Web MIDI input from a digital piano, with a device-local latency setting.
- Four synthesized sound worlds, all zero-download.
- URL-addressable destinations, local JSON import/export, and an installable PWA with offline practice.
- A public marketing site served from the same static deployment, whose claims are generated from the shipped route table.
- Static GitHub Pages deployment.

Every entry above is checked against the product. Each capability in `shared/src/marketing/capability.ts` declares the phrase this document must use for it while it ships, and `npm run product:check` fails when a shipped feature is missing from this section or still named as a non-goal below. This section drifted for four slices before that check existed.

## Explicitly Out Of Scope

These are not part of the current supported product surface:

- account sign-in, user profiles, or any sign-in page
- cloud sync or hosted practice storage
- backend APIs, PostgreSQL, AWS services, or direct database access
- pricing, payments, subscriptions, or any commercial offer, and therefore any pricing page
- waitlist capture, email collection, or any other form that leaves the device
- MusicXML import, engraved score rendering, or lesson content beyond the built-in and imported libraries
- downloadable or sampled audio packs
- translated UI, locale selector, runtime locale negotiation, right-to-left layout, or localized music notation
- analytics, telemetry, conversion measurement, advertising pixels, or third-party tracking
- social sharing or classroom management

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
- Update i18n/l10n guidance when language, locale, notation-label, or localization-readiness expectations change.
- Add or update ADRs for durable scope changes.
- Run `npm run product:check` after scope, roadmap, feature-intake, or product-positioning changes.
- Run `npm run product:learning` after product-feedback, analytics, experiment, feature-flag, survey, support, product-metric, delivery-metric, DORA, roadmap, or product-learning changes.

## Verification

`npm run product:check` verifies that:

- this product scope contract keeps product promise, current scope, out-of-scope, foundation-first, feature-intake, change-rule, and verification sections
- README current scope keeps the supported surface and explicit non-goals visible
- contributor guidance and PR review keep feature scope and foundation-first expectations visible
- architecture, quality, release, backend-readiness, threat-model, data, privacy, accessibility, testing, operations, and ADR docs stay connected to the current product boundary
