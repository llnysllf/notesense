// Building a reading test that actually measures reading.
//
// Two properties make a test worth trusting. It must be *unseen*, so it is not
// measuring how recently the learner drilled these exact notes; and equivalent
// forms must be *comparable*, so two sittings can be put side by side. Both come
// from generating the form from a seed against a fixed spec, rather than pulling
// from whatever practice happened to cover.

import { createRng, randInt } from "../exercises/seededRng";

export type ReadingTestSpec = {
  // Inclusive sounding range the form draws from.
  lowMidi: number;
  highMidi: number;
  promptCount: number;
  seed: string;
};

export type ReadingTestForm = {
  seed: string;
  lowMidi: number;
  highMidi: number;
  // Sounding pitches, in the order they are presented.
  prompts: number[];
};

const MIN_PROMPTS = 1;
const MAX_PROMPTS = 60;

// Generates a form. Deterministic in the seed, so the same seed always produces
// the same test and results can be compared across sittings and devices.
export function buildReadingTestForm({ lowMidi, highMidi, promptCount, seed }: ReadingTestSpec): ReadingTestForm {
  const low = Math.min(lowMidi, highMidi);
  const high = Math.max(lowMidi, highMidi);
  const count = Math.min(MAX_PROMPTS, Math.max(MIN_PROMPTS, Math.round(promptCount)));
  const rng = createRng(`reading-test:${seed}`);

  const prompts: number[] = [];
  let previous: number | undefined;

  for (let index = 0; index < count; index += 1) {
    let midi = randInt(rng, low, high);
    // Avoid presenting the same pitch twice in a row: a repeat measures memory
    // of the last prompt rather than reading.
    if (previous !== undefined && midi === previous && high > low) {
      midi = midi === high ? midi - 1 : midi + 1;
    }
    prompts.push(midi);
    previous = midi;
  }

  return { seed, lowMidi: low, highMidi: high, prompts };
}

export type ReadingTestResult = {
  promptCount: number;
  correct: number;
  accuracy: number; // 0..1
  medianResponseMs: number;
};

// Scores a completed form. Median rather than mean response time, because one
// interruption should not define the result.
export function scoreReadingTest(answers: readonly { correct: boolean; responseMs: number }[]): ReadingTestResult {
  const promptCount = answers.length;
  if (promptCount === 0) {
    return { promptCount: 0, correct: 0, accuracy: 0, medianResponseMs: 0 };
  }

  const correct = answers.filter((answer) => answer.correct).length;
  const times = answers.map((answer) => answer.responseMs).sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const medianResponseMs =
    times.length % 2 === 0 ? Math.round(((times[middle - 1] ?? 0) + (times[middle] ?? 0)) / 2) : (times[middle] ?? 0);

  return {
    promptCount,
    correct,
    accuracy: correct / promptCount,
    medianResponseMs,
  };
}
