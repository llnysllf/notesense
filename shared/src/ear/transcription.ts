// Grading a written-down transcription, and deciding how often the source may
// be replayed.
//
// Transcription is the one ear family where both sides are *musical* time. The
// learner is not performing the phrase, they are notating it, so an entered note
// either sits on the written beat or it does not — there is no tolerance band to
// apply, and applying one would forgive a rhythm that was written wrong.
// (Performed time, with its tolerance and latency correction, is the rhythm
// engine's job and stays there.)

import { type ReadingMode } from "../reading/readingMode";
import { compareSequences, type SequenceComparison } from "./sequence";

export type TranscribedNote = { midi: number; onsetTicks: number };

export type TranscriptionScore = {
  // Did they hear the right pitches, in the right order.
  pitch: SequenceComparison;
  // Of the notes they placed correctly, how many landed on the written beat.
  rhythmAccuracy: number;
  alignedCount: number;
  // 0..1 overall, pitch weighted more heavily: a note in the wrong place is
  // still recognisably the note, and a note that is simply wrong is not.
  total: number;
  isExact: boolean;
};

const PITCH_WEIGHT = 0.65;
const RHYTHM_WEIGHT = 0.35;

// Compares an entered transcription to the phrase that was played.
export function scoreTranscription(
  expected: readonly TranscribedNote[],
  entered: readonly TranscribedNote[],
): TranscriptionScore {
  const pitch = compareSequences(
    expected.map((note) => note.midi),
    entered.map((note) => note.midi),
  );

  // Walk the alignment so rhythm is only judged on notes that were actually
  // matched. Asking whether a note the learner never wrote is on the beat is
  // not a question with an answer.
  let expectedIndex = 0;
  let enteredIndex = 0;
  let onBeat = 0;
  let aligned = 0;

  for (const step of pitch.steps) {
    if (step.kind === "correct" || step.kind === "wrong") {
      const expectedNote = expected[expectedIndex];
      const enteredNote = entered[enteredIndex];
      if (expectedNote && enteredNote) {
        aligned += 1;
        if (expectedNote.onsetTicks === enteredNote.onsetTicks) onBeat += 1;
      }
      expectedIndex += 1;
      enteredIndex += 1;
    } else if (step.kind === "missing") {
      expectedIndex += 1;
    } else {
      enteredIndex += 1;
    }
  }

  const rhythmAccuracy = aligned === 0 ? 0 : onBeat / aligned;
  // Rhythm is scaled by how much of the phrase was actually written down, so a
  // learner who wrote two notes perfectly in time does not score full marks for
  // rhythm on a ten-note phrase.
  const rhythmShare = expected.length === 0 ? 0 : (rhythmAccuracy * aligned) / expected.length;

  return {
    pitch,
    rhythmAccuracy,
    alignedCount: aligned,
    total: pitch.accuracy * PITCH_WEIGHT + rhythmShare * RHYTHM_WEIGHT,
    isExact: pitch.isExact && aligned === expected.length && onBeat === aligned,
  };
}

// How often the source may be heard again.
//
// A replay limit is not a way to make the exercise harder; it is what stops
// "ear training" quietly becoming "press replay until you have it". Learn mode
// has none, because there is nothing to protect while someone is still building
// the skill.
export type ReplayPolicy = {
  // Infinity when unlimited, so callers compare rather than branching on a flag.
  maxReplays: number;
  // Whether the source can be replayed while notes are being entered, as
  // opposed to only before the first entry.
  allowDuringEntry: boolean;
};

export const REPLAY_POLICIES: Readonly<Record<ReadingMode, ReplayPolicy>> = {
  learn: { maxReplays: Number.POSITIVE_INFINITY, allowDuringEntry: true },
  practice: { maxReplays: 3, allowDuringEntry: true },
  // A test measures what the learner can hold, so the phrase is played once.
  test: { maxReplays: 1, allowDuringEntry: false },
  custom: { maxReplays: Number.POSITIVE_INFINITY, allowDuringEntry: true },
};

export function canReplay(mode: ReadingMode, replaysUsed: number, hasEnteredNotes: boolean): boolean {
  const policy = REPLAY_POLICIES[mode];
  if (hasEnteredNotes && !policy.allowDuringEntry) return false;
  return replaysUsed < policy.maxReplays;
}

// What to tell the learner about their remaining replays, or nothing when the
// count is not a constraint worth putting on screen.
export function describeReplays(mode: ReadingMode, replaysUsed: number): string | undefined {
  const policy = REPLAY_POLICIES[mode];
  if (!Number.isFinite(policy.maxReplays)) return undefined;
  const left = Math.max(0, policy.maxReplays - replaysUsed);
  if (left === 0) return "No replays left.";
  return left === 1 ? "1 replay left." : `${left} replays left.`;
}
