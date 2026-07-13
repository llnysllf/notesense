// Derived, read-only analysis over a validated Song: note range, difficulty
// grading, and measure/barline layout. Split from songData.ts (which owns
// the raw contract, caps, and untrusted-input normalization) to keep each
// file under the architecture source-size budget.

import { noteIdToMidi, type NoteDuration, type Song, type TimeSignature } from "./songData";

export type SongNoteRange = {
  lowestNoteId: string;
  highestNoteId: string;
};

// Lowest and highest note across the song, for library display and for
// matching songs against a learner's comfortable keyboard range.
export function getSongNoteRange(song: Song): SongNoteRange {
  let lowest: { noteId: string; midi: number } | undefined;
  let highest: { noteId: string; midi: number } | undefined;

  for (const event of song.events) {
    for (const noteId of event.noteIds) {
      const midi = noteIdToMidi(noteId);
      if (midi === undefined) continue;
      if (!lowest || midi < lowest.midi) lowest = { noteId, midi };
      if (!highest || midi > highest.midi) highest = { noteId, midi };
    }
  }

  return {
    lowestNoteId: lowest?.noteId ?? "C4",
    highestNoteId: highest?.noteId ?? "C4",
  };
}

export type SongDifficulty = "beginner" | "intermediate" | "advanced";

// Difficulty is derived from measurable song properties instead of being
// hand-assigned, so imported songs are graded by the same rules as
// built-ins: range span, length, accidentals, eighth notes, and chords
// each add difficulty points.
export function getSongDifficulty(song: Song): SongDifficulty {
  const range = getSongNoteRange(song);
  const span = (noteIdToMidi(range.highestNoteId) ?? 60) - (noteIdToMidi(range.lowestNoteId) ?? 60);

  let score = 0;
  if (span >= 15) score += 2;
  else if (span >= 10) score += 1;

  if (song.events.length > 40) score += 2;
  else if (song.events.length > 16) score += 1;

  if (song.events.some((event) => event.noteIds.some((noteId) => noteId.includes("#")))) score += 1;
  if (song.events.some((event) => event.duration === "eighth")) score += 1;
  if (song.events.some((event) => event.noteIds.length > 1)) score += 1;

  if (score <= 1) return "beginner";
  return score <= 3 ? "intermediate" : "advanced";
}

const DIFFICULTY_RANK: Record<SongDifficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function compareSongsByDifficulty(a: Song, b: Song): number {
  const rankDelta = DIFFICULTY_RANK[getSongDifficulty(a)] - DIFFICULTY_RANK[getSongDifficulty(b)];
  return rankDelta !== 0 ? rankDelta : a.events.length - b.events.length;
}

// Duration length in eighth notes — the smallest unit any of our durations
// divides evenly into, so measure-length math stays integer and exact
// instead of drifting on floating point.
const DURATION_EIGHTHS: Record<NoteDuration, number> = { whole: 8, half: 4, quarter: 2, eighth: 1 };

// The bottom number of a time signature: the note value worth one beat,
// written as its denominator (quarter -> 4, eighth -> 8, ...).
const DURATION_DENOMINATOR: Record<NoteDuration, number> = { whole: 1, half: 2, quarter: 4, eighth: 8 };

export function getTimeSignatureLabel(timeSignature: TimeSignature): string {
  return `${timeSignature.beatsPerMeasure}/${DURATION_DENOMINATOR[timeSignature.beatUnit]}`;
}

// Length of one measure in eighth notes, given a time signature.
export function getMeasureLengthInEighths(timeSignature: TimeSignature): number {
  return timeSignature.beatsPerMeasure * DURATION_EIGHTHS[timeSignature.beatUnit];
}

// Marks which events start a new measure, so the sheet can draw barlines.
// Works for any time signature (simple or compound) by accumulating each
// event's length in eighth notes and wrapping at the measure length; a
// duration that does not divide evenly into the remaining measure space
// (uncommon in these simplified single-line transcriptions) leaves the
// following barline offset rather than crashing or misrendering.
export function getEventMeasureStarts(song: Song): boolean[] {
  const measureLength = getMeasureLengthInEighths(song.timeSignature);
  let position = 0;

  return song.events.map((event) => {
    const isMeasureStart = position === 0;
    position = (position + DURATION_EIGHTHS[event.duration]) % measureLength;
    return isMeasureStart;
  });
}
