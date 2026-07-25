// Untrusted-input normalization for the score model, following the same
// posture as songData.ts: validate types, clamp counts, drop malformed pieces,
// and never let a stored or imported value be trusted before it passes through
// here. Anything unrepresentable is dropped rather than corrupting the model.

import { isRational, type Rational } from "./time";
import { isSpelledPitch, spelledToMidi, type SpelledPitch } from "./pitch";
import {
  SCORE_MODEL_VERSION,
  type ClefChange,
  type KeySignature,
  type Measure,
  type Meter,
  type Score,
  type ScoreEvent,
  type ScorePart,
  type Voice,
} from "./score";

export const MAX_SCORE_PARTS = 4;
export const MAX_SCORE_MEASURES = 400;
export const MAX_VOICES_PER_MEASURE = 4;
export const MAX_EVENTS_PER_VOICE = 128;
export const MAX_PITCHES_PER_NOTE = 8;
export const MAX_SCORE_TITLE_LENGTH = 120;

const BEAT_UNITS = [1, 2, 4, 8, 16];
const LOWEST_MIDI = 21;
const HIGHEST_MIDI = 108;

function cappedString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : undefined;
}

// A rational offset (>= 0) or duration (> 0). Returns undefined otherwise.
function normalizeRational(value: unknown, requirePositive: boolean): Rational | undefined {
  if (!isRational(value)) return undefined;
  if (requirePositive && value.num <= 0) return undefined;
  if (!requirePositive && value.num < 0) return undefined;
  return { num: value.num, den: value.den };
}

function normalizePitch(value: unknown): SpelledPitch | undefined {
  if (!isSpelledPitch(value)) return undefined;
  const midi = spelledToMidi(value);
  if (midi < LOWEST_MIDI || midi > HIGHEST_MIDI) return undefined;
  return { step: value.step, alter: value.alter, octave: value.octave };
}

export function normalizeMeter(value: unknown): Meter | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { beats?: unknown; beatUnit?: unknown };
  if (
    typeof candidate.beats !== "number" ||
    !Number.isInteger(candidate.beats) ||
    candidate.beats < 1 ||
    candidate.beats > 32 ||
    typeof candidate.beatUnit !== "number" ||
    !BEAT_UNITS.includes(candidate.beatUnit)
  ) {
    return undefined;
  }
  return { beats: candidate.beats, beatUnit: candidate.beatUnit as Meter["beatUnit"] };
}

function normalizeKeySignature(value: unknown): KeySignature | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { fifths?: unknown; mode?: unknown };
  if (typeof candidate.fifths !== "number" || !Number.isInteger(candidate.fifths)) return undefined;
  if (candidate.fifths < -7 || candidate.fifths > 7) return undefined;
  const mode = candidate.mode === "major" || candidate.mode === "minor" ? candidate.mode : undefined;
  return mode ? { fifths: candidate.fifths, mode } : { fifths: candidate.fifths };
}

function normalizeClef(value: unknown): ClefChange | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { measure?: unknown; sign?: unknown; line?: unknown };
  if (
    typeof candidate.measure !== "number" ||
    !Number.isInteger(candidate.measure) ||
    candidate.measure < 1 ||
    (candidate.sign !== "G" && candidate.sign !== "F") ||
    typeof candidate.line !== "number" ||
    !Number.isInteger(candidate.line) ||
    candidate.line < 1 ||
    candidate.line > 5
  ) {
    return undefined;
  }
  return { measure: candidate.measure, sign: candidate.sign, line: candidate.line };
}

function normalizeEvent(value: unknown, id: string): ScoreEvent | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as {
    kind?: unknown;
    offset?: unknown;
    duration?: unknown;
    pitches?: unknown;
    tie?: unknown;
  };
  const offset = normalizeRational(candidate.offset, false);
  const duration = normalizeRational(candidate.duration, true);
  if (!offset || !duration) return undefined;

  if (candidate.kind === "rest") {
    return { kind: "rest", id, offset, duration };
  }
  if (candidate.kind !== "note" || !Array.isArray(candidate.pitches)) return undefined;

  const pitches = candidate.pitches
    .map(normalizePitch)
    .filter((pitch): pitch is SpelledPitch => pitch !== undefined)
    .slice(0, MAX_PITCHES_PER_NOTE);
  if (pitches.length === 0) return undefined;

  const tie =
    candidate.tie === "start" || candidate.tie === "continue" || candidate.tie === "stop" ? candidate.tie : undefined;
  return tie ? { kind: "note", id, offset, duration, pitches, tie } : { kind: "note", id, offset, duration, pitches };
}

function normalizeVoice(value: unknown, id: string): Voice | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { id?: unknown; events?: unknown };
  if (!Array.isArray(candidate.events)) return undefined;
  const voiceId = cappedString(candidate.id, 60) ?? id;
  const events = candidate.events
    .slice(0, MAX_EVENTS_PER_VOICE)
    .map((event, index) => normalizeEvent(event, `${voiceId}-e${index}`))
    .filter((event): event is ScoreEvent => event !== undefined);
  return events.length > 0 ? { id: voiceId, events } : undefined;
}

function normalizeMeasure(value: unknown, index: number): Measure | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as {
    id?: unknown;
    number?: unknown;
    meter?: unknown;
    keySignature?: unknown;
    voices?: unknown;
  };
  if (!Array.isArray(candidate.voices)) return undefined;
  const number =
    typeof candidate.number === "number" && Number.isInteger(candidate.number) ? candidate.number : index + 1;
  const id = cappedString(candidate.id, 60) ?? `m${number}`;
  const voices = candidate.voices
    .slice(0, MAX_VOICES_PER_MEASURE)
    .map((voice, voiceIndex) => normalizeVoice(voice, `${id}-v${voiceIndex}`))
    .filter((voice): voice is Voice => voice !== undefined);
  if (voices.length === 0) return undefined;

  const meter = normalizeMeter(candidate.meter);
  const keySignature = normalizeKeySignature(candidate.keySignature);
  const measure: Measure = { id, number, voices };
  if (meter) measure.meter = meter;
  if (keySignature) measure.keySignature = keySignature;
  return measure;
}

function normalizePart(value: unknown, index: number): ScorePart | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { id?: unknown; name?: unknown; clefs?: unknown; measures?: unknown };
  if (!Array.isArray(candidate.measures)) return undefined;
  const id = cappedString(candidate.id, 60) ?? `p${index + 1}`;
  const measures = candidate.measures
    .slice(0, MAX_SCORE_MEASURES)
    .map((measure, measureIndex) => normalizeMeasure(measure, measureIndex))
    .filter((measure): measure is Measure => measure !== undefined);
  if (measures.length === 0) return undefined;

  const clefs = Array.isArray(candidate.clefs)
    ? candidate.clefs.map(normalizeClef).filter((clef): clef is ClefChange => clef !== undefined)
    : [];
  return { id, name: cappedString(candidate.name, MAX_SCORE_TITLE_LENGTH) ?? id, clefs, measures };
}

// Normalizes an untrusted score-shaped value. Returns undefined when it cannot
// become a playable score (no title, or no part with any valid measure).
export function normalizeScore(value: unknown): Score | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { id?: unknown; title?: unknown; parts?: unknown };
  const title = cappedString(candidate.title, MAX_SCORE_TITLE_LENGTH);
  if (!title || !Array.isArray(candidate.parts)) return undefined;

  const parts = candidate.parts
    .slice(0, MAX_SCORE_PARTS)
    .map((part, index) => normalizePart(part, index))
    .filter((part): part is ScorePart => part !== undefined);
  if (parts.length === 0) return undefined;

  const id = cappedString(candidate.id, 120) ?? `score-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return { id, version: SCORE_MODEL_VERSION, title, parts };
}
