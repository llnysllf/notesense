# ADR 0056: Expand Pitch Training And Add Melody Dictation

## Status

Accepted

## Context

Pitch training was limited to seven natural notes from C4 to B4. That range could establish a basic note-to-sound association, but it did not train accidentals, octave placement, the full piano register, or the ability to retain and transcribe a sequence of pitches. Note-reading already offered configurable ranges, so the ear-training surface needed equivalent control without weakening the fast practice loop.

## Decision

- Define all 88 piano pitches from A0 through C8 as the shared pitch-training catalogue, with stable piano-key ids and frequencies.
- Offer natural, chromatic, two-octave, full-keyboard, and custom pitch ranges. Custom endpoints are selected directly on an 88-key keyboard and normalized before use.
- Keep single-pitch recognition as the default exercise and score the exact piano key, including accidental and octave.
- Add melody dictation as a second exercise. It plays three, four, or five notes from the selected range and accepts an ordered sequence entered on the piano keyboard.
- Score melody positions as individual pitch attempts so existing mastery, adaptive selection, history, and export contracts remain useful.
- Extend persisted settings additively and normalize older saved data to the chromatic single-pitch defaults.

## Consequences

- Ear training now supports the full piano register and accidentals without adding a backend or new dependency.
- The 88-key keyboard is both the range selector and answer surface, preserving a direct note-to-instrument mental model.
- Mobile learners use the existing overview and movable keyboard window rather than shrinking 88 interactive keys below usable sizes.
- Future interval, chord, or rhythm exercises can build on the expanded pitch catalogue, but remain outside the current scope.
