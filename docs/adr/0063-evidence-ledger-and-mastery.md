# ADR 0063: Add Evidence Ledger And Derived Mastery

## Status

Accepted

## Context

NoteSense records practice as aggregate counters: `PracticeProgress` holds per-note `attempts`/`correct` totals, merged across devices by newest-wins. The repository already documents that this design can undercount concurrent offline practice, and it has three further limits. It cannot support durable review scheduling, because there are no per-attempt dates. It cannot be recomputed, because once counters are folded together the underlying attempts are gone, so changing a scoring or curriculum algorithm would mean migrating history rather than rebuilding it. And it cannot carry the richer signals later slices need — timing, input source, mistake codes, and which competency an attempt is evidence for.

Slices 1 through 3 established the material (`Score`), the content (`ExerciseDefinition`, structured answers), and the runtime that produces answers. What is missing is the durable record of what a learner actually did.

## Decision

Add a framework-free evidence ledger under `shared/src/evidence/`, where immutable attempt events are the record of truth and everything else is derived:

- `attemptEvent.ts` — the `AttemptEvent` contract: globally unique `eventId` as an idempotency key, `deviceId` plus a monotonic `deviceSequence`, wall-clock start/answer times, a `responseMs` measured on the audio/performance clock, the structured answer, the result with visible components and mistake codes, and per-competency evidence with dimensions. Each event carries an `AttemptVersions` block (`scoringVersion`, `curriculumVersion`, `skillMappingVersion`, `transportVersion`) and an optional server `receivedAtIso`. `unionAttemptEvents` deduplicates by `eventId` and is idempotent.
- `mastery.ts` — `buildMasterySnapshot` derives recency-weighted accuracy, a fluency signal, and a confidence value from the event stream. Snapshots record their `algorithmVersion` and the newest event they include, and are a cache: rebuilding from the same events reproduces them exactly.
- `scheduler.ts` — spaced review plus deterministic, seeded selection that weighs due review, low mastery, low confidence, and prerequisite readiness, and returns a plain-language explanation for every choice.
- `migration.ts` — converts legacy counters into one low-confidence summary event per note, marked `source: "legacy-summary"`, with no invented response time and no fabricated per-attempt dates.
- `projections.ts` — bounded UI read models (a recent-attempt window, per-session rollups) that exclude inferred evidence.

The contract is **stable and versioned, not frozen**: the versioning fields exist precisely so rhythm, MIDI, and singing can extend evidence without a schema break.

Scope is the framework-free ledger. The IndexedDB event store, projection persistence, export schema v2, and routing live practice through this ledger are a deferred follow-up.

## Consequences

- Concurrent practice on two devices loses no accepted attempts, because union is by event id rather than by counter arithmetic.
- Mastery, scheduling, and dashboards can be rebuilt from the ledger after an algorithm change instead of being migrated in place.
- Legacy evidence is honestly labelled: it provides a gentle starting hint and is excluded from fluency and discounted in confidence, rather than masquerading as measured attempts.
- Selection is explainable and deterministic, so a learner can be told why an exercise was chosen and a test can assert it.
- Raw audio and pitch frames never enter the ledger; only derived summaries do, consistent with the microphone privacy posture.
- Additive: no storage key, export schema, or existing behavior changes yet. Changes to the event contract, mastery algorithm, or selection policy require data-contract, privacy, architecture, and testing review.
