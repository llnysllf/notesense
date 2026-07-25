// Structured answers. What the learner produced (UserAnswer) and what counts as
// correct (ExpectedAnswer) are discriminated unions, never strings, so chords,
// sequences, rhythms, and sung contours are all representable. Performed time is
// kept in audio-clock seconds; expected rhythm positions are musical ticks — the
// two are matched by the scorer (later slices), not conflated here.

import { type Transport } from "../music/time";

// Derived-only summary of a sung attempt. Raw audio and pitch frames are never
// stored, so only these numbers ever reach an answer.
export type SungSummary = {
  centsError: number;
  stability: number;
  onsetErrorMs: number;
  durationError: number;
  inTune: boolean;
};

export type PerformedNote = { midi: number; onsetSeconds: number; durationSeconds?: number; velocity?: number };

export type UserAnswer =
  | { kind: "pitch"; midi: number }
  | { kind: "pitch-set"; midi: number[] }
  | { kind: "pitch-sequence"; midi: number[] }
  | { kind: "rhythm"; onsetsSeconds: number[] }
  | { kind: "performance"; notes: PerformedNote[] }
  | { kind: "choice"; optionId: string }
  | { kind: "voice"; summary: SungSummary };

export type ExpectedAnswer =
  | { kind: "pitch"; midi: number }
  | { kind: "pitch-set"; midi: number[] }
  | { kind: "pitch-sequence"; midi: number[] }
  | { kind: "rhythm"; onsetTicks: number[]; transport: Transport }
  | { kind: "choice"; optionId: string }
  | { kind: "voice"; targetMidi: number[] };

function isMidi(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 21 && value <= 108;
}

function midiArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isMidi)) return undefined;
  return [...value];
}

export function normalizeUserAnswer(value: unknown): UserAnswer | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { kind?: unknown; midi?: unknown; onsetsSeconds?: unknown; optionId?: unknown };
  switch (candidate.kind) {
    case "pitch":
      return isMidi(candidate.midi) ? { kind: "pitch", midi: candidate.midi } : undefined;
    case "pitch-set": {
      const midi = midiArray(candidate.midi);
      return midi ? { kind: "pitch-set", midi } : undefined;
    }
    case "pitch-sequence": {
      const midi = midiArray(candidate.midi);
      return midi ? { kind: "pitch-sequence", midi } : undefined;
    }
    case "choice":
      return typeof candidate.optionId === "string" && candidate.optionId.length > 0
        ? { kind: "choice", optionId: candidate.optionId }
        : undefined;
    default:
      return undefined;
  }
}

export type AnswerMatch =
  { gradable: true; correct: boolean; mistakeCodes: string[] } | { gradable: false; reason: string };

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === [...b].sort((x, y) => x - y)[i]);
const sameSequence = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// Exact-match grading for the pitch and choice families. Rhythm, performance,
// and voice answers require the transport clock and scoring policy, so they are
// graded by the runtime/scoring slices and reported as not gradable here.
export function matchAnswer(expected: ExpectedAnswer, user: UserAnswer): AnswerMatch {
  if (expected.kind === "pitch" && user.kind === "pitch") {
    return {
      gradable: true,
      correct: expected.midi === user.midi,
      mistakeCodes: expected.midi === user.midi ? [] : ["wrong-pitch"],
    };
  }
  if (expected.kind === "pitch-set" && user.kind === "pitch-set") {
    const correct = sameSet(expected.midi, user.midi);
    return { gradable: true, correct, mistakeCodes: correct ? [] : ["wrong-chord"] };
  }
  if (expected.kind === "pitch-sequence" && user.kind === "pitch-sequence") {
    const correct = sameSequence(expected.midi, user.midi);
    return { gradable: true, correct, mistakeCodes: correct ? [] : ["wrong-sequence"] };
  }
  if (expected.kind === "choice" && user.kind === "choice") {
    const correct = expected.optionId === user.optionId;
    return { gradable: true, correct, mistakeCodes: correct ? [] : ["wrong-choice"] };
  }
  if (expected.kind === user.kind) {
    return { gradable: false, reason: `${expected.kind} answers are graded by the runtime` };
  }
  return { gradable: false, reason: `answer kind ${user.kind} does not match expected ${expected.kind}` };
}
