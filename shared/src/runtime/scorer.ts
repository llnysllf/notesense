// The scorer interface the runtime grades through, plus the default exact-match
// scorer that delegates to the Slice 2 answer grading. Timing, performance, and
// voice answers are marked not-yet-gradable here; the rhythm/MIDI/singing slices
// register richer scorers against the same interface.

import { matchAnswer, type ExpectedAnswer, type UserAnswer } from "../exercises/answer";

export type AttemptOutcome = { gradable: boolean; correct: boolean; mistakeCodes: string[] };

export type Scorer = (expected: ExpectedAnswer, answer: UserAnswer) => AttemptOutcome;

export const exactScorer: Scorer = (expected, answer) => {
  const match = matchAnswer(expected, answer);
  if (!match.gradable) return { gradable: false, correct: false, mistakeCodes: [] };
  return { gradable: true, correct: match.correct, mistakeCodes: match.mistakeCodes };
};
