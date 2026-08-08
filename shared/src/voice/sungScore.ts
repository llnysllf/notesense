// Scoring a sung attempt.
//
// The components are the ones a singing teacher would actually name: was the
// pitch centred, was it steady, were the moves between notes clean, was it in
// time, and did they get through it. Tone quality is not among them and never
// will be — it is subjective, culturally loaded, and not something a browser
// should be grading.
//
// The load-bearing rule here is that **vibrato must not be punished**. Vibrato
// is a periodic wobble of a few hertz, and a naive "steadiness" measure reads it
// as instability — telling a trained singer their good habit is a fault.
// Stability is therefore measured on the slow-moving centre line, where vibrato
// has already averaged out, so what is left is genuine drift.

import { type SungSummary } from "../exercises/answer";
import { centreLine, centreMidi, onsetSeconds, voicedFrames, type PitchFrame } from "./contour";

export type SungTarget = {
  midi: number;
  onsetSeconds: number;
  durationSeconds: number;
};

export type SungComponents = {
  // 0..1 each.
  pitchCentre: number;
  pitchStability: number;
  transitions: number;
  rhythm: number;
  completion: number;
};

export type SungNoteResult = {
  targetMidi: number;
  sung: boolean;
  sungMidi?: number;
  centsError?: number;
  onsetErrorMs?: number;
};

export type SungScore = {
  components: SungComponents;
  total: number;
  perNote: SungNoteResult[];
  // The only thing that is ever stored: derived features, no frames, no audio.
  summary: SungSummary;
};

// Within this, a singer is on the note. Wider than a tuner would allow, because
// a human voice is not an oscillator and a phrase sung at ±30 cents reads as in
// tune to everyone listening.
export const IN_TUNE_CENTS = 35;
// Beyond this, the note is wrong rather than out of tune.
const WRONG_NOTE_CENTS = 150;
// Drift of the centre line beyond this counts as fully unsteady.
const UNSTEADY_SEMITONES = 1;
// An onset this far from where it was written is fully late or early.
const ONSET_TOLERANCE_MS = 300;

const WEIGHTS: SungComponents = {
  pitchCentre: 0.35,
  pitchStability: 0.2,
  transitions: 0.15,
  rhythm: 0.15,
  completion: 0.15,
};

const EMPTY_COMPONENTS: SungComponents = {
  pitchCentre: 0,
  pitchStability: 0,
  transitions: 0,
  rhythm: 0,
  completion: 0,
};

const EMPTY_SUMMARY: SungSummary = {
  centsError: 0,
  stability: 0,
  onsetErrorMs: 0,
  durationError: 0,
  inTune: false,
};

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number);
}

function spread(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length);
}

// The frames belonging to one target note, by the window it was written in.
function framesForTarget(contour: readonly PitchFrame[], target: SungTarget): PitchFrame[] {
  const end = target.onsetSeconds + target.durationSeconds;
  return voicedFrames(contour).filter((frame) => frame.atSeconds >= target.onsetSeconds && frame.atSeconds < end);
}

export type ScoreSingingOptions = {
  targets: readonly SungTarget[];
  contour: readonly PitchFrame[];
};

// Scores an attempt. An attempt with nothing voiced in it returns zeros rather
// than NaN — a results screen with a broken number on it discredits every other
// number beside it.
export function scoreSinging({ targets, contour }: ScoreSingingOptions): SungScore {
  const voiced = voicedFrames(contour);
  if (targets.length === 0 || voiced.length === 0) {
    return { components: EMPTY_COMPONENTS, total: 0, perNote: [], summary: EMPTY_SUMMARY };
  }

  const sungOnsets = onsetSeconds(contour);
  const perNote: SungNoteResult[] = targets.map((target, index) => {
    const frames = framesForTarget(contour, target);
    if (frames.length === 0) return { targetMidi: target.midi, sung: false };

    const sungMidi = centreMidi(frames);
    const centsError = (sungMidi - target.midi) * 100;
    // Onsets are matched positionally: the nth thing sung against the nth thing
    // written. Matching by nearest time would let a singer who dropped a note
    // score well by having the rest land near something.
    const onset = sungOnsets[index];
    const result: SungNoteResult = {
      targetMidi: target.midi,
      sung: true,
      sungMidi,
      centsError,
    };
    if (onset !== undefined) result.onsetErrorMs = (onset - target.onsetSeconds) * 1000;
    return result;
  });

  const sung = perNote.filter((note) => note.sung);
  const errors = sung.map((note) => Math.abs(note.centsError ?? 0));

  // Pitch centre: how close each sung note sat to its target, on average.
  const pitchCentre = clampUnit(errors.length === 0 ? 0 : 1 - median(errors) / WRONG_NOTE_CENTS);

  // Stability: drift of the slow centre line, per note. Vibrato has already
  // averaged out of that line, so a singer with a healthy wobble is not marked
  // down for it.
  const drifts = targets.map((target) => {
    const frames = framesForTarget(contour, target);
    return frames.length < 2 ? 0 : spread(centreLine(frames));
  });
  const measuredDrifts = drifts.filter((_, index) => (perNote[index] as SungNoteResult).sung);
  const pitchStability = clampUnit(measuredDrifts.length === 0 ? 0 : 1 - median(measuredDrifts) / UNSTEADY_SEMITONES);

  // Transitions: did the singer arrive at each new note, or slide vaguely
  // toward it. Judged as the share of note changes where the sung interval
  // matched the written one.
  const transitions = scoreTransitions(perNote);

  // Rhythm: how close each onset was to where it was written.
  const onsetErrors = sung.map((note) => Math.abs(note.onsetErrorMs ?? ONSET_TOLERANCE_MS));
  const rhythm = clampUnit(onsetErrors.length === 0 ? 0 : 1 - median(onsetErrors) / ONSET_TOLERANCE_MS);

  const completion = clampUnit(sung.length / targets.length);

  const components: SungComponents = { pitchCentre, pitchStability, transitions, rhythm, completion };
  const total = clampUnit(
    components.pitchCentre * WEIGHTS.pitchCentre +
      components.pitchStability * WEIGHTS.pitchStability +
      components.transitions * WEIGHTS.transitions +
      components.rhythm * WEIGHTS.rhythm +
      components.completion * WEIGHTS.completion,
  );

  const signedErrors = sung.map((note) => note.centsError ?? 0);
  const centsError = median(signedErrors);
  const summary: SungSummary = {
    centsError,
    stability: pitchStability,
    onsetErrorMs: median(sung.map((note) => note.onsetErrorMs ?? 0)),
    // How much of the written phrase was actually sustained.
    durationError: 1 - completion,
    inTune: Math.abs(centsError) <= IN_TUNE_CENTS,
  };

  return { components, total, perNote, summary };
}

// Did the singer move by the written interval between one note and the next.
function scoreTransitions(perNote: readonly SungNoteResult[]): number {
  const moves: number[] = [];
  for (let index = 1; index < perNote.length; index += 1) {
    const from = perNote[index - 1] as SungNoteResult;
    const to = perNote[index] as SungNoteResult;
    if (!from.sung || !to.sung) continue;
    const written = to.targetMidi - from.targetMidi;
    const actual = (to.sungMidi ?? 0) - (from.sungMidi ?? 0);
    moves.push(Math.abs(actual - written));
  }
  if (moves.length === 0) return perNote.some((note) => note.sung) ? 1 : 0;
  return clampUnit(1 - median(moves) / (WRONG_NOTE_CENTS / 100));
}

// Plain language, leading with the weakest thing that is worth working on.
// Never mentions tone, timbre, or how the voice sounds.
export function describeSinging(score: SungScore): string {
  if (score.perNote.every((note) => !note.sung)) return "Nothing was sung, so there is nothing to score yet.";

  const { components, summary } = score;
  if (components.completion < 0.6) return "You stopped part way. Getting through the phrase comes before polishing it.";

  // Direction is keyed to the in-tune band rather than to a component score: a
  // quarter tone flat is worth naming even though it is not a disaster, and
  // "close" would waste the one piece of feedback that is actionable.
  if (!summary.inTune) {
    const direction = summary.centsError < 0 ? "under" : "over";
    return `The notes are sitting ${direction} the pitch. Try the reference note again before you start.`;
  }
  if (components.transitions < 0.6)
    return "The moves between notes are landing short. Aim for the next note, not near it.";
  if (components.pitchStability < 0.6)
    return "The pitch drifts while you hold it. Steady breath keeps the note where it started.";
  if (components.rhythm < 0.6) return "The notes are right; they are arriving away from the beat.";
  return "In tune and steady.";
}
