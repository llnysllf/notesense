// The canonical score model: parts, measures, voices, and events over rational
// musical time. Richer than the legacy single-line Song (multi-voice, spelled
// pitch, ties, meter/key per measure) so reading, rhythm, MIDI, singing, and
// imports can all target one representation. Validation and the legacy adapter
// live in sibling modules to keep this file to types + pure derivations.

import { rational, type Rational } from "./time";
import type { SpelledPitch } from "./pitch";

// The current model version, persisted on every Score so migrations are
// possible without guessing shape.
export const SCORE_MODEL_VERSION = 1;

// A time signature. beatUnit is the denominator (4 = quarter, 8 = eighth), so
// one beat is worth 4/beatUnit quarter notes.
export type Meter = { beats: number; beatUnit: 1 | 2 | 4 | 8 | 16 };

// Circle-of-fifths key signature: positive = sharps, negative = flats.
export type KeySignature = { fifths: number; mode?: "major" | "minor" };

// A clef placed at a measure. sign G on line 2 is treble; F on line 4 is bass.
export type ClefChange = { measure: number; sign: "G" | "F"; line: number };

export type ScoreNote = {
  kind: "note";
  id: string;
  offset: Rational; // from the start of its measure, in quarters
  duration: Rational;
  pitches: SpelledPitch[]; // one entry per simultaneously sounding note (chord)
  tie?: "start" | "continue" | "stop";
};

export type ScoreRest = {
  kind: "rest";
  id: string;
  offset: Rational;
  duration: Rational;
};

export type ScoreEvent = ScoreNote | ScoreRest;

export type Voice = { id: string; events: ScoreEvent[] };

export type Measure = {
  id: string;
  number: number;
  meter?: Meter; // present when the meter changes (always on measure 1)
  // A shortened opening measure. The following measure starts after this
  // duration rather than after a full bar.
  pickupDuration?: Rational;
  keySignature?: KeySignature;
  voices: Voice[];
};

export type ScorePart = {
  id: string;
  name: string;
  clefs: ClefChange[];
  measures: Measure[];
};

export type Score = {
  id: string;
  version: number;
  title: string;
  parts: ScorePart[];
};

// Length of one measure in quarter-note units for a meter: beats * (4/beatUnit).
// 4/4 -> 4 quarters; 6/8 -> 3 quarters; 3/4 -> 3 quarters.
export function measureLengthInQuarters(meter: Meter): Rational {
  return rational(meter.beats * 4, meter.beatUnit) as Rational;
}
