// The learner's comfortable singing range.
//
// Asked for once, and then respected. Handing a bass a phrase written for a
// soprano is not a hard exercise, it is an impossible one, and a learner who
// fails it learns nothing except that the app does not know who they are.
//
// The range is stored as two MIDI numbers and nothing else. It is derived from
// pitch frames, so no audio is involved in producing it or in keeping it.

import { centreMidi, voicedFrames, type PitchFrame } from "./contour";

export const VOCAL_RANGE_VERSION = 1;

export type VocalRange = {
  version: number;
  lowMidi: number;
  highMidi: number;
};

// Below this many voiced frames there is not enough to call a range.
const MIN_FRAMES = 8;
// Trim this share off each end before taking the extremes, so one squeak or
// creak does not define what someone can comfortably sing.
const TRIM = 0.1;
// A range narrower than this is a measurement failure, not a voice.
const MIN_SPAN_SEMITONES = 5;

function trimmedExtremes(midis: readonly number[]): { low: number; high: number } {
  const sorted = [...midis].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * TRIM);
  const kept = sorted.slice(cut, sorted.length - cut);
  const usable = kept.length > 0 ? kept : sorted;
  return { low: usable[0] as number, high: usable[usable.length - 1] as number };
}

// Derives a range from a calibration take, or undefined when there was not
// enough singing to say. Undefined is the honest answer: guessing a range and
// then holding a learner to it is worse than asking again.
export function deriveVocalRange(contour: readonly PitchFrame[]): VocalRange | undefined {
  const voiced = voicedFrames(contour);
  if (voiced.length < MIN_FRAMES) return undefined;

  const { low, high } = trimmedExtremes(voiced.map((frame) => frame.midi));
  if (high - low < MIN_SPAN_SEMITONES) return undefined;

  return { version: VOCAL_RANGE_VERSION, lowMidi: Math.round(low), highMidi: Math.round(high) };
}

// Reads a stored range. Untrusted input: anything unusable is discarded rather
// than repaired, because a wrong range silently makes every exercise unsingable.
export function normalizeVocalRange(value: unknown): VocalRange | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { version?: unknown; lowMidi?: unknown; highMidi?: unknown };
  if (candidate.version !== VOCAL_RANGE_VERSION) return undefined;
  if (typeof candidate.lowMidi !== "number" || typeof candidate.highMidi !== "number") return undefined;

  const low = Math.round(candidate.lowMidi);
  const high = Math.round(candidate.highMidi);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return undefined;
  if (low < 21 || high > 108 || high - low < MIN_SPAN_SEMITONES) return undefined;

  return { version: VOCAL_RANGE_VERSION, lowMidi: low, highMidi: high };
}

// Moves a phrase into the learner's range by whole octaves. Octaves rather than
// arbitrary transposition, so the phrase keeps its key and its shape — a
// learner practising a written exercise should be singing the exercise.
export function fitToRange(midis: readonly number[], range: VocalRange): number[] {
  if (midis.length === 0) return [];

  const centre = (range.lowMidi + range.highMidi) / 2;
  const phraseCentre = midis.reduce((total, midi) => total + midi, 0) / midis.length;
  const octaves = Math.round((centre - phraseCentre) / 12);
  return midis.map((midi) => midi + octaves * 12);
}

// Whether a phrase can be sung in this range at all, after octave fitting.
export function isSingable(midis: readonly number[], range: VocalRange): boolean {
  const fitted = fitToRange(midis, range);
  return fitted.every((midi) => midi >= range.lowMidi && midi <= range.highMidi);
}

// A reference pitch to give before a phrase: the note the singer starts on,
// which is the one piece of help that does not do the exercise for them.
export function referenceMidi(midis: readonly number[], range: VocalRange): number | undefined {
  const fitted = fitToRange(midis, range);
  return fitted[0];
}

// A range described the way a singer would say it, using the centre rather than
// a voice-type label — this is not enough evidence to tell someone they are a
// tenor.
export function describeRange(range: VocalRange | undefined): string {
  if (!range) return "No range set yet.";
  const span = range.highMidi - range.lowMidi;
  return `About ${Math.round(span / 12)} octave${span >= 24 ? "s" : ""} of comfortable range.`;
}

export function contourCentre(contour: readonly PitchFrame[]): number {
  return centreMidi(contour);
}
