# ADR 0055: Add Song Sheet Reading

## Status

Accepted

## Context

NoteSense trained two isolated skills: single-note staff reading and pitch recognition. Learners asked for the next step toward real playing: reading whole melodies in notation, the way sheet music is actually practiced. The product scope contract explicitly excluded rhythm drills and expanded lesson content, so growing in this direction needed a deliberate scope decision rather than incremental drift.

The owner approved a phased plan: self-paced song sheet reading from a built-in public-domain library first, then chord entry, MIDI file upload, and a timed metronome mode in follow-up changes, each moving the scope contract as it lands.

## Decision

- Add a "Songs" app section, separate from the existing practice modes, so the reading and pitch drills stay untouched.
- Model songs as a framework-agnostic data contract in `shared/src/songData.ts`: a song is a validated sequence of events, each holding one to four piano note ids and a duration (whole, half, quarter, eighth), with hard caps on events, chord size, title length, and library size.
- Keep playthrough logic pure in `src/songEngine.ts`: answers are checked as exact note-id set equality, mistakes keep the player on the current event, and summaries derive accuracy and duration.
- Render notation in a dedicated `SheetStaff` SVG component that reuses the diatonic staff-position formula from `noteData.ts`, supports sheet accidentals (sharps), rhythm glyphs, chord stacking, ledger lines, and a windowed view around the current event.
- Persist per-song results (best accuracy, completions, last played) under a new LocalStorage key `notesense.songProgress.v1`, normalized on load like all other stored data.
- Ship built-in songs only from the public domain, validated at build time against the song contract.

## Consequences

- The product now has a lesson-content surface: future song additions must stay public domain and pass the song data contract.
- Sheet accidentals exist in the songs section while the single-note drills stay naturals-only; the scope contract wording distinguishes the two surfaces.
- Chord entry, MIDI upload, and timed rhythm scoring remain explicitly out of scope until their follow-up changes land, keeping the contract truthful at every commit.
- The export schema will need a versioned extension when imported songs arrive; per-song progress is already isolated under its own storage key to make that change additive.
