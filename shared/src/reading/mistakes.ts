// Naming what went wrong, so feedback can say something more useful than
// "incorrect".
//
// The codes describe the *shape* of the error in pitch terms, because that is
// what a reader can act on: confusing an octave is a different problem from
// landing a step away, and both are different from a guess. Nothing here claims
// to know why the learner erred, only what the error was.

export type ReadingMistakeCode = "wrong-octave" | "semitone-slip" | "step-slip" | "third-slip" | "distant-miss";

export const READING_MISTAKE_LABELS: Readonly<Record<ReadingMistakeCode, string>> = {
  "wrong-octave": "Octave",
  "semitone-slip": "Semitone",
  "step-slip": "Step",
  "third-slip": "Third",
  "distant-miss": "Far",
};

// Classifies a reading miss from the two sounding pitches. Returns undefined
// when the answer was correct, so callers cannot accidentally label a success.
export function classifyReadingMistake(expectedMidi: number, answeredMidi: number): ReadingMistakeCode | undefined {
  if (expectedMidi === answeredMidi) return undefined;

  const distance = Math.abs(expectedMidi - answeredMidi);
  if (distance % 12 === 0) return "wrong-octave";
  if (distance === 1) return "semitone-slip";
  if (distance === 2) return "step-slip";
  if (distance === 3 || distance === 4) return "third-slip";
  return "distant-miss";
}

export type ReadingMiss = {
  // The pitch that was on the staff.
  expectedMidi: number;
  answeredMidi: number;
  code: ReadingMistakeCode;
};

export type MistakeGroup = {
  expectedMidi: number;
  misses: number;
  // The most frequent way this note was missed, for the feedback line.
  dominantCode: ReadingMistakeCode;
};

export const MAX_REPLAY_ITEMS = 5;

// Groups a session's misses by the note that was on the staff, most-missed
// first. Grouping by the *prompt* rather than by the wrong answer is what makes
// the result actionable: it says which notes to look at again.
export function groupMisses(misses: readonly ReadingMiss[]): MistakeGroup[] {
  const byExpected = new Map<number, { misses: number; codes: Map<ReadingMistakeCode, number> }>();

  for (const miss of misses) {
    const entry = byExpected.get(miss.expectedMidi) ?? { misses: 0, codes: new Map() };
    entry.misses += 1;
    entry.codes.set(miss.code, (entry.codes.get(miss.code) ?? 0) + 1);
    byExpected.set(miss.expectedMidi, entry);
  }

  return [...byExpected.entries()]
    .map(([expectedMidi, entry]) => {
      const dominant = [...entry.codes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return {
        expectedMidi,
        misses: entry.misses,
        dominantCode: (dominant?.[0] ?? "distant-miss") as ReadingMistakeCode,
      };
    })
    .sort((a, b) => b.misses - a.misses || a.expectedMidi - b.expectedMidi);
}

// The short corrective set to re-present: the most-missed notes, capped so a bad
// round does not turn into an endless punishment queue.
export function buildReplaySet(misses: readonly ReadingMiss[], limit = MAX_REPLAY_ITEMS): number[] {
  return groupMisses(misses)
    .slice(0, Math.max(0, limit))
    .map((group) => group.expectedMidi);
}

// A plain-language summary of what went wrong, or undefined when there is
// nothing to report. Kept here so the wording is tested rather than inlined.
export function describeMistakes(misses: readonly ReadingMiss[]): string | undefined {
  const groups = groupMisses(misses);
  const worst = groups[0];
  if (!worst) return undefined;

  const noun = worst.misses === 1 ? "time" : "times";
  return `${READING_MISTAKE_LABELS[worst.dominantCode]} — missed ${worst.misses} ${noun}.`;
}
