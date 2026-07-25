# ADR 0061: Add Exercise Content Platform

## Status

Accepted

## Context

NoteSense's planned features — a complete sight-reading path, rhythm, ear training, placement, and a Reading Score — all need practice content. Without a shared content contract, each feature would invent its own generator, its own idea of "what counts as correct," and its own notion of which skill an item trains, then be retrofitted later. The earlier delivery plan placed a content platform near the end of the roadmap, which would have forced exactly that rework.

Two modelling requirements shape the contract. First, a learner's answer is not a string: chords, ordered sequences, rhythms, and sung contours must be representable, and expected answers must be comparable to them. Second, competency (what the learner can do) must stay separate from content dimensions (clef, range, key, tempo, input mode) and from difficulty, so mastery can be tracked as competency × dimensions instead of as one combinatorial enum.

## Decision

Add a framework-free content platform under `shared/src/curriculum/` and `shared/src/exercises/`, built on the Slice 1 musical domain:

- `curriculum/competencies.ts`, `dimensions.ts`, `prerequisites.ts`, `difficulty.ts` — the stable competency ids later slices track against, the content-dimension vocabulary, an acyclic prerequisite graph with a topological order, and a continuous 0..1 difficulty scale.
- `exercises/answer.ts` — structured `UserAnswer` and `ExpectedAnswer` discriminated unions plus exact-match grading for the pitch and choice families. Performed time stays in audio-clock seconds; expected rhythm positions stay in musical ticks; the two are matched by the runtime, not conflated here.
- `exercises/exerciseDefinition.ts` — the versioned `ExerciseDefinition` (competencies, dimensions, difficulty, stimulus, expected answer, input modes, scoring policy, provenance) with an untrusted-input normalizer.
- `exercises/scoringPolicy.ts` — scoring declared as data so components stay visible.
- `exercises/seededRng.ts`, `generator.ts`, and `generators/` — a deterministic, versioned generator interface and registry, with reading and pitch generators for the families that exist today.
- `exercises/validation.ts` — semantic content validation (answerability, stimulus/answer consistency, licensing, duplicate ids), verified by a high-volume seeded invariant test.

Scope is intentionally lean: schema, catalogs, validation, and two generators. The dev content-preview surface and the `content:check` CI gate are deferred to a follow-up, and an authoring UI is out of scope.

## Consequences

- Reading, pitch, rhythm, ear, and imported material all become `ExerciseDefinition`s, so the runtime, scorer, and evidence engine consume one shape.
- Answers are structured from the start, so chords, sequences, rhythms, and sung contours never need a later schema break.
- Mastery can be computed per competency × dimensions without a combinatorial id explosion.
- Generated content is deterministic and versioned, so items are reproducible and recompilable after an algorithm change.
- High-volume invariant testing over the generators' seed space guards content quality cheaply, without an authoring platform.
- Additive: no storage key, export schema, or existing behavior changes. Changes to the exercise schema, competency catalog, or generator contract require data-contract, architecture, and testing review.
