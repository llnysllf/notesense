# ADR 0072: MIDI Import And Repertoire

## Status

Accepted

## Context

Everything NoteSense teaches is currently material NoteSense chose: generated drills and a built-in public-domain
library. A learner preparing an actual piece has no way to practise it here, which puts a ceiling on how useful
the app can be once someone is past the beginner stage.

This is also the first slice that reads a file a stranger could have written. Every previous input has been a
key press, a note, or the app's own export. A parser is a different risk surface, and the roadmap says as much:
files untrusted, reject pathological input, no remote fetch, local by default.

## Decision

### The parser is ours, and deliberately small

The roadmap asks for a "vetted parser". Rather than add a dependency, `shared/src/import/midiFile.ts` implements
the subset a practice app needs — note on/off, tempo, time signature, track names — and skips everything else
_by its declared length_ so the cursor never drifts into the middle of an event and starts reading noise as
notes. This avoids expanding the dependency-license allowlist, which is not a decision to make unilaterally,
and Standard MIDI is a small, stable, well-specified binary format where the whole risk is bounds checking.

**This reasoning does not transfer to MusicXML**, and the roadmap already says so: never hand-roll a general
MusicXML parser. See 13C below.

Every place a file declares a size is bounded: total bytes, track count, event count, and variable-length
quantities (capped at the format's own four bytes, because a run of continuation bytes otherwise loops until
the file ends). A note-on with velocity zero is a release — the same trap live MIDI has. Timecode division is
refused rather than approximated, because a value that looks right and drifts is worse than a clear refusal.

### Import is honest about being lossy

A MIDI file records a performance; a practice song records something readable. `midiToSong.ts` maps between them
and reports what it cost: notes moved onto the beat, chords that exceeded the cap, a piece longer than the
limit. A note's written length is the gap to the next onset rather than its recorded release, because using
releases produces a page of tied values nobody could sight-read.

The preview sits next to the controls that change it, so the learner sees the result before agreeing to it.

### Save and load agree by construction

An imported piece is passed through the same `normalizeSong` the library reads back with. Without that, the app
could report "Saved to your songs" for a piece the loader silently discards — a success message that lies.
**This was a real bug caught in testing**, not a hypothetical.

### Imported pieces are ordinary pieces

They land in the same library, render in the same player, and produce the same progress records as built-in
material. That is the slice's exit gate, and it holds because there is only one path: `useSongSession` returns
one list and the workspace renders it.

This also gives `normalizeImportedSongs` its first caller — the parsing side had existed since the song contract
was written, with no screen behind it.

### 13C — MusicXML: the spike, not the dependency

The roadmap requires a spike comparing Verovio and OpenSheetMusicDisplay **before** committing, with bundle size
as the gate that matters most. That measurement has not been made, and both candidates are large enough to
dwarf the current budget: the whole app is presently well under 500 KiB raw, and a WASM engraver alone is
typically several times that even lazily loaded.

**No engraver dependency is added here.** Adding one is a bundle decision and a license decision, and both are
the project owner's to make, exactly as with the router choice in Slice 5. What this slice delivers is the MIDI
half plus a clean seam: `shared/src/import/` is where a MusicXML mapper would live, and it maps into the same
song model, so the spike can be run against a real integration point rather than in the abstract.

## Consequences

- A learner can practise their own MIDI files, with the same player and the same progress as built-in pieces.
- The parser is bounded against malformed and hostile files, and says why it refused rather than failing silently.
- Imports never leave the device; only the mapped result is stored, not the original file.
- **MusicXML is not supported.** 13C remains open pending a spike and a dependency decision.
- The mapping is deliberately lossy: one voice per onset, four named durations, no ties, tuplets, or repeats.
  Files using those import with a warning rather than being refused, which is the right trade for practice
  material but means an imported piece is not a faithful edition.
- Only the first tempo and time signature are used. A piece that changes either says so.
