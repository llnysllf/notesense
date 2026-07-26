// Spelled pitch: the notated identity of a note (step + accidental + octave),
// kept distinct from its sounding MIDI number so enharmonics and future
// transposing instruments are representable. Spelling is retained through
// conversions instead of being collapsed to a pitch class.

import { noteIdToMidi } from "../songData";

export type Step = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Alter = -2 | -1 | 0 | 1 | 2;
export type SpelledPitch = { step: Step; alter: Alter; octave: number };

const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const ALTERS: Alter[] = [-2, -1, 0, 1, 2];

// Default (sharp) spelling per pitch class, matching the app's existing
// note-id vocabulary (C#, D#, F#, G#, A#).
const SHARP_SPELLING: Array<{ step: Step; alter: Alter }> = [
  { step: "C", alter: 0 },
  { step: "C", alter: 1 },
  { step: "D", alter: 0 },
  { step: "D", alter: 1 },
  { step: "E", alter: 0 },
  { step: "F", alter: 0 },
  { step: "F", alter: 1 },
  { step: "G", alter: 0 },
  { step: "G", alter: 1 },
  { step: "A", alter: 0 },
  { step: "A", alter: 1 },
  { step: "B", alter: 0 },
];

const NOTE_ID_PATTERN = /^([A-G])(#?)(-?\d)$/;

export function isStep(value: unknown): value is Step {
  return typeof value === "string" && (STEPS as string[]).includes(value);
}

export function isSpelledPitch(value: unknown): value is SpelledPitch {
  if (typeof value !== "object" || value === null) return false;
  const p = value as { step?: unknown; alter?: unknown; octave?: unknown };
  return (
    isStep(p.step) &&
    typeof p.alter === "number" &&
    (ALTERS as number[]).includes(p.alter) &&
    typeof p.octave === "number" &&
    Number.isInteger(p.octave)
  );
}

// Sounding MIDI number for a spelled pitch (may fall outside the piano range;
// callers that require an 88-key note validate separately).
export function spelledToMidi(pitch: SpelledPitch): number {
  return (pitch.octave + 1) * 12 + STEP_SEMITONES[pitch.step] + pitch.alter;
}

// Canonical (sharp) spelling for a piano MIDI number, or undefined outside the
// 88-key range (A0=21 .. C8=108).
export function midiToSpelled(midi: number): SpelledPitch | undefined {
  if (!Number.isInteger(midi) || midi < 21 || midi > 108) return undefined;
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const spelling = SHARP_SPELLING[pitchClass] as { step: Step; alter: Alter };
  return { step: spelling.step, alter: spelling.alter, octave };
}

// "F#3" -> { step: "F", alter: 1, octave: 3 }. Reuses the app's note-id
// validation so spelling stays consistent with the keyboard vocabulary.
export function noteIdToSpelled(noteId: string): SpelledPitch | undefined {
  if (noteIdToMidi(noteId) === undefined) return undefined;
  const match = NOTE_ID_PATTERN.exec(noteId);
  if (!match?.[1] || match[3] === undefined) return undefined;
  return { step: match[1] as Step, alter: match[2] === "#" ? 1 : 0, octave: Number(match[3]) };
}

// Renders a spelled pitch back to the app's sharp-based note id, or undefined
// when the sounding pitch has no 88-key representation. Enharmonic spellings
// (e.g. E# or Fb) collapse to their canonical sharp/natural id.
export function spelledToNoteId(pitch: SpelledPitch): string | undefined {
  const canonical = midiToSpelled(spelledToMidi(pitch));
  if (!canonical) return undefined;
  return `${canonical.step}${canonical.alter === 1 ? "#" : ""}${canonical.octave}`;
}

// The app note id for a piano MIDI number, or "" when out of the 88-key range.
// Total (no chained optionals), so callers with a known-valid midi need no
// defensive fallback.
export function midiToNoteId(midi: number): string {
  const spelled = midiToSpelled(midi);
  if (!spelled) return "";
  return `${spelled.step}${spelled.alter === 1 ? "#" : ""}${spelled.octave}`;
}
