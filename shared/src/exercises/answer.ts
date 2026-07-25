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

function finiteSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeTransport(value: unknown): Transport | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { version?: unknown; ppq?: unknown };
  if (
    typeof candidate.version !== "number" ||
    !Number.isInteger(candidate.version) ||
    candidate.version < 1 ||
    typeof candidate.ppq !== "number" ||
    !Number.isInteger(candidate.ppq) ||
    candidate.ppq < 1
  ) {
    return undefined;
  }
  return { version: candidate.version, ppq: candidate.ppq };
}

export function normalizeUserAnswer(value: unknown): UserAnswer | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as {
    kind?: unknown;
    midi?: unknown;
    onsetsSeconds?: unknown;
    notes?: unknown;
    optionId?: unknown;
    summary?: unknown;
  };
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
    case "rhythm":
      return Array.isArray(candidate.onsetsSeconds) && candidate.onsetsSeconds.every(finiteSeconds)
        ? { kind: "rhythm", onsetsSeconds: [...candidate.onsetsSeconds] }
        : undefined;
    case "performance": {
      if (!Array.isArray(candidate.notes)) return undefined;
      const notes: PerformedNote[] = [];
      for (const value of candidate.notes) {
        if (typeof value !== "object" || value === null) return undefined;
        const note = value as { midi?: unknown; onsetSeconds?: unknown; durationSeconds?: unknown; velocity?: unknown };
        if (
          !isMidi(note.midi) ||
          !finiteSeconds(note.onsetSeconds) ||
          (note.durationSeconds !== undefined &&
            (typeof note.durationSeconds !== "number" ||
              !Number.isFinite(note.durationSeconds) ||
              note.durationSeconds <= 0)) ||
          (note.velocity !== undefined &&
            (typeof note.velocity !== "number" ||
              !Number.isInteger(note.velocity) ||
              note.velocity < 0 ||
              note.velocity > 127))
        ) {
          return undefined;
        }
        notes.push({
          midi: note.midi,
          onsetSeconds: note.onsetSeconds,
          ...(note.durationSeconds === undefined ? {} : { durationSeconds: note.durationSeconds }),
          ...(note.velocity === undefined ? {} : { velocity: note.velocity }),
        });
      }
      return { kind: "performance", notes };
    }
    case "voice": {
      if (typeof candidate.summary !== "object" || candidate.summary === null) return undefined;
      const summary = candidate.summary as Record<string, unknown>;
      if (
        !["centsError", "stability", "onsetErrorMs", "durationError"].every(
          (key) => typeof summary[key] === "number" && Number.isFinite(summary[key]),
        ) ||
        typeof summary.inTune !== "boolean"
      ) {
        return undefined;
      }
      return {
        kind: "voice",
        summary: {
          centsError: summary.centsError as number,
          stability: summary.stability as number,
          onsetErrorMs: summary.onsetErrorMs as number,
          durationError: summary.durationError as number,
          inTune: summary.inTune,
        },
      };
    }
    default:
      return undefined;
  }
}

export function normalizeExpectedAnswer(value: unknown): ExpectedAnswer | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as {
    kind?: unknown;
    midi?: unknown;
    optionId?: unknown;
    onsetTicks?: unknown;
    transport?: unknown;
    targetMidi?: unknown;
  };
  if (candidate.kind === "pitch" && isMidi(candidate.midi)) return { kind: "pitch", midi: candidate.midi };
  if (candidate.kind === "pitch-set" || candidate.kind === "pitch-sequence") {
    const midi = midiArray(candidate.midi);
    return midi ? { kind: candidate.kind, midi } : undefined;
  }
  if (candidate.kind === "choice" && typeof candidate.optionId === "string" && candidate.optionId.length > 0) {
    return { kind: "choice", optionId: candidate.optionId };
  }
  if (
    candidate.kind === "rhythm" &&
    Array.isArray(candidate.onsetTicks) &&
    candidate.onsetTicks.length > 0 &&
    candidate.onsetTicks.every((tick) => typeof tick === "number" && Number.isInteger(tick) && tick >= 0)
  ) {
    const transport = normalizeTransport(candidate.transport);
    return transport ? { kind: "rhythm", onsetTicks: [...candidate.onsetTicks], transport } : undefined;
  }
  if (candidate.kind === "voice") {
    const targetMidi = midiArray(candidate.targetMidi);
    return targetMidi ? { kind: "voice", targetMidi } : undefined;
  }
  return undefined;
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
