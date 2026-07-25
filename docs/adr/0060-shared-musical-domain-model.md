# ADR 0060: Add Shared Musical Domain Model

## Status

Accepted

## Context

NoteSense is growing from a note-reading and pitch trainer into a broader music-literacy system whose planned features — rhythm grading, real-piano MIDI, singing analysis, generated content, and score import — all need a common way to describe musical material and its timing. The existing `Song`/`SongEvent` contract in `shared/src/songData.ts` is intentionally small: a single line of events, four note durations, integer eighth-note measure math, and no notion of rational time, spelled pitch, multiple voices, ties, or per-measure meter and key. Building each future feature on its own private model would fork timing and pitch handling repeatedly and force painful migrations later.

The domain also has a subtle correctness requirement. Authored musical time must stay exact under tuplets (triplets, and later swing and other subdivisions) and pickups, which an integer sixteenth grid cannot represent. Performed time (when a learner actually plays) is a separate, device-dependent measurement that must not be conflated with authored score positions.

## Decision

Add a framework-free canonical musical domain under `shared/src/music/`, re-exported through `@notesense/shared` and `src/types.ts`:

- `time.ts` — rational musical time in quarter-note units as the persisted source of truth, plus a versioned `Transport` that compiles rational time to integer ticks. The default transport uses PPQ 960, which is divisible by 2 and 3 so sixteenths and triplets compile to exact integers. PPQ is a compiler resolution, not a stored limitation; a future transport version can change it without altering authored scores.
- `pitch.ts` — spelled pitch (step, accidental, octave) kept distinct from sounding MIDI, with conversions to and from the existing note-id vocabulary.
- `score.ts` — the `Score` model: parts, measures, voices, notes, rests, ties, per-measure meter/key signature, and an explicit pickup duration, carrying a `SCORE_MODEL_VERSION`.
- `validation.ts` — untrusted-input normalization and caps, mirroring the posture of `songData.ts`.
- `compileTimeline.ts` — compilation of a `Score` to an ordered timeline of expected onsets in ticks (musical time only), plus a `ticksToSeconds` projection that is the single place musical time meets the audio clock. Performed input is not modeled here.
- `legacySongAdapter.ts` — a total `songToScore` and a best-effort `scoreToSong`, so the built-in song catalog keeps working unchanged.

The model is additive. No existing storage key, export schema, or `Song` behavior changes in this step; the legacy contract remains the compatibility format behind the adapter.

## Consequences

- Future rhythm, MIDI, singing, generated-content, and import features target one representation instead of inventing parallel timing and pitch models.
- Authored time stays exact for tuplets and pickups because rational time, not an integer grid, is the source of truth; ticks are derived per versioned transport.
- Musical time and performed time are kept separate by construction, which the scoring work in later slices depends on.
- Pickups begin at authored tick zero and advance the next measure by their explicit duration; they never become leading transport silence.
- Every built-in song round-trips through the adapter with no behavior regression, verified by tests over the full catalog.
- The score model is versioned and normalized as untrusted input, so imported and stored scores can be validated and migrated without corrupting the model.
- Changes to the score model shape, the transport/PPQ contract, or the legacy adapter require data-contract, architecture, and testing review.
