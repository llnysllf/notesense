# ADR 0069: Placement And Reading Score

## Status

Accepted

## Context

Two questions have no answer yet. A new learner does not know where to start, and a returning learner has no
way to tell whether their reading is actually improving. Practice statistics do not answer the second one: they
measure whatever the learner chose to drill, on material they have already seen, so they reward repetition
rather than reading.

Both features are easy to get wrong in the same way — by producing a confident-looking number that is not
supported by anything. A placement that claims to have measured someone from five questions, or a score
presented as a standard when it has never been calibrated, is worse than no feature, because a learner will act
on it.

The roadmap deliberately ordered this after the rhythm engine (Slice 8) and reproducible test forms (Slice 7),
so that the rhythmic component of a reading score is real rather than a placeholder.

## Decision

`shared/src/assessment/` holds the whole model, framework-free.

`passage.ts` generates the material. Two properties make an assessment worth trusting, and both are structural
here rather than procedural. A passage is **unseen**: generated from a seed against a difficulty profile, never
drawn from the built-in library or from what the learner has practised, so the result measures reading rather
than recall. And two passages at the same difficulty are **equivalent**: same bars, tempo, rhythmic vocabulary,
range, and — the part that is easy to miss — the same note _density_. Rhythm generation is random within its
vocabulary, so two bars could come out as one whole note or eight quarters: the same length on paper and a
completely different reading task. Forms are steered to a per-band target density by choosing the closest of a
fixed set of candidates from derived seeds, which keeps the choice deterministic and terminating. Without that,
"compare your score to your last one" would be comparing two different tests.

Every band stays inside what one treble staff reads with a few ledger lines. The Reading Score measures treble
reading at this version; bass and grand staff arrive with the wider range work rather than being faked here.
Pitches below the top band come from naturals only: real sight-reading material is in a key, and a line of
randomly sprinkled sharps is not a harder reading test so much as a different, less musical one. Accidentals
appear at the hard band, where reading them is the point.

`readingScore.ts` scores a sitting into four components that stay visible: note accuracy, rhythmic accuracy
(from the Slice 8 grader, at the passage's own tempo, corrected for measured device latency), continuity, and
fluency. The overall number exists so a learner can see movement, not so it can stand alone — "62" tells nobody
anything, while "the notes were right and the rhythm slipped" is a practice plan. Continuity and fluency are
computed against notes in their notated positions rather than against a compacted list, so a skipped note
leaves a hole instead of shifting everything after it. Fluency is pace scaled by coverage: pace alone would let
a learner play the first three notes briskly, stop, and score full marks for fluency on a passage they
abandoned. An empty or abandoned run produces zeros, never `NaN`.

`READING_SCORE_CALIBRATED` is `false`, and every result carries `isProvisional`. It is flipped by a calibration
study, not by a release that changes the weights.

`placement.ts` is a bounded staircase. It starts below the middle so the first item is not discouraging, moves
in steps that halve on each reversal and never exceed 0.25, and stops when the answers have settled, at an item
limit, or at the floor or ceiling — each with its own plain-language explanation. Confidence is capped at 0.7:
five items is a starting point, not a measurement. `placementPrior` returns nothing once real practice evidence
exists, which is how the exit gate "placement seeds recommendations without overwriting real evidence" is
enforced in code rather than by convention. Legacy imported summaries do not count as measured evidence.

`history.ts` refuses to compare results that measured different things. A trend is only reported against the
most recent earlier sitting with the same algorithm version, form version, and difficulty band; otherwise the
screen says why there is no comparison. Silently comparing across versions would manufacture progress that
never happened.

The share card is drawn on a canvas in the page and saved locally only when asked for. What it can contain is
constrained by its type: `buildShareCard` is handed six fields, not the record, so it cannot reach an id, a
seed, or a device. The date is day-precision — a timestamp says when someone was at their instrument, which a
shared image does not need. The provisional caveat is drawn onto the image itself, because a screenshot
outlives the screen that explained it.

Assessment results are stored under their own keys, apart from the evidence ledger. A measurement must not feed
the adaptive repetition that decides what to practise, or the next assessment would no longer be unseen.

The assessment runs on the same metronome as a rhythm round, with one addition: if audio is unavailable the run
continues on the performance clock with a silent count-in, and the screen says so. Refusing to test someone
because their browser blocked audio would be a worse answer than a silent count-in.

## Consequences

- A new learner gets a starting point in about a minute, and can skip it or change it.
- A returning learner can see whether their reading has moved, on material they have not seen, compared only
  against their own equivalent sittings.
- Nothing in the feature claims to be standardized, and the caveat survives being screenshotted.
- The Reading Score covers treble-clef reading only at this version.
- Placement items are single notes; it estimates reading difficulty, not rhythm or ear.
- The score has not been validated against any external measure. It should not be marketed as standardized
  until a calibration study exists, and the algorithm version travels with every stored result so that history
  can be recomputed rather than migrated when one does.
