# ADR 0058: Use Staff-Based Pitch Sequence Transcription

## Status

Accepted

## Context

The first pitch-sequence exercise used a row of text slots. That made the learner record note names, but it did not build the staff-reading skill needed to connect a heard pitch to written music. The exercise also stopped at five notes and did not make it obvious that answers could be entered during playback.

## Decision

- Call the learner-facing exercise pitch sequence rather than melody because it tests an ordered series of pitches without rhythm or phrasing.
- Allow sequence lengths from three through sixteen notes with a stepper control.
- Show a grand staff with an advancing entry cursor as the answer surface from the beginning of each round.
- Accept piano-key answers immediately after playback starts so the learner can write while listening.
- Render entered pitches on the staff and show position-level results after submission. Use octave marks for notes outside a readable staff register while preserving the exact piano-key identity.
- Keep the original persisted `melody` and `melodyLength` identifiers as compatibility aliases until a future data-schema migration is planned.

## Consequences

- The transcription task now practices both pitch memory and written-note placement.
- Longer sequences can train sustained auditory memory without adding a new backend or audio dependency.
- The staff remains legible on mobile by wrapping positions into systems while the existing responsive piano window stays available below it.
- Old local settings continue to load, while new product copy and controls use pitch-sequence language.
