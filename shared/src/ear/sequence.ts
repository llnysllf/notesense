// Comparing what the learner wrote down to what they heard.
//
// The naive comparison — line the two up index by index — is wrong in the one
// case that matters most. Miss a single note in the middle and every note after
// it shifts, so a learner who heard nine of ten notes correctly is told they got
// one right. That feedback is not just harsh, it is false, and it points them at
// the wrong thing to fix.
//
// So the two sequences are aligned properly, with insertions and deletions
// modelled as such. The result says *where* the error is and *what kind* it is,
// which is what makes "correct a specific transcription error" possible rather
// than showing a total and leaving the learner to guess.

export type SequenceStep =
  | { kind: "correct"; expectedIndex: number; midi: number }
  | { kind: "wrong"; expectedIndex: number; expectedMidi: number; playedMidi: number; semitoneError: number }
  // Heard but not written down.
  | { kind: "missing"; expectedIndex: number; expectedMidi: number }
  // Written down but not in the source. `afterIndex` is the expected position it
  // follows, so the UI can point at the gap rather than at a note.
  | { kind: "extra"; afterIndex: number; playedMidi: number };

export type SequenceComparison = {
  steps: SequenceStep[];
  expectedCount: number;
  correctCount: number;
  wrongCount: number;
  missingCount: number;
  extraCount: number;
  // 0..1. Partial credit, because a learner who got eight of ten notes has
  // learned something a pass/fail verdict would throw away.
  accuracy: number;
  isExact: boolean;
  // Where to send the learner first. Absent when the answer was exact.
  firstErrorIndex?: number;
};

type Op = "match" | "substitute" | "delete" | "insert";

// Costs. A substitution is cheaper than a delete-plus-insert so that a wrong
// note is reported as a wrong note rather than as a note missed and a note
// invented — the same edit distance, but very different advice.
const SUBSTITUTE_COST = 1;
const INDEL_COST = 1.5;

// Aligns two sequences by edit distance and returns the operations in order.
function align(expected: readonly number[], played: readonly number[]): Op[] {
  const rows = expected.length;
  const columns = played.length;
  const cost: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));
  const from: Op[][] = Array.from({ length: rows + 1 }, () => new Array<Op>(columns + 1).fill("match"));

  for (let row = 1; row <= rows; row += 1) {
    cost[row]![0] = row * INDEL_COST;
    from[row]![0] = "delete";
  }
  for (let column = 1; column <= columns; column += 1) {
    cost[0]![column] = column * INDEL_COST;
    from[0]![column] = "insert";
  }

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const same = expected[row - 1] === played[column - 1];
      const diagonal = (cost[row - 1]![column - 1] as number) + (same ? 0 : SUBSTITUTE_COST);
      const deletion = (cost[row - 1]![column] as number) + INDEL_COST;
      const insertion = (cost[row]![column - 1] as number) + INDEL_COST;

      let best = diagonal;
      let op: Op = same ? "match" : "substitute";
      if (deletion < best) {
        best = deletion;
        op = "delete";
      }
      if (insertion < best) {
        best = insertion;
        op = "insert";
      }
      cost[row]![column] = best;
      from[row]![column] = op;
    }
  }

  const operations: Op[] = [];
  let row = rows;
  let column = columns;
  while (row > 0 || column > 0) {
    const op = row === 0 ? "insert" : column === 0 ? "delete" : (from[row]![column] as Op);
    operations.push(op);
    if (op === "match" || op === "substitute") {
      row -= 1;
      column -= 1;
    } else if (op === "delete") {
      row -= 1;
    } else {
      column -= 1;
    }
  }
  return operations.reverse();
}

// Compares a written-down sequence to the one that was played.
export function compareSequences(expected: readonly number[], played: readonly number[]): SequenceComparison {
  const steps: SequenceStep[] = [];
  let expectedIndex = 0;
  let playedIndex = 0;

  for (const op of align(expected, played)) {
    if (op === "match") {
      steps.push({ kind: "correct", expectedIndex, midi: expected[expectedIndex] as number });
      expectedIndex += 1;
      playedIndex += 1;
    } else if (op === "substitute") {
      const expectedMidi = expected[expectedIndex] as number;
      const playedMidi = played[playedIndex] as number;
      steps.push({
        kind: "wrong",
        expectedIndex,
        expectedMidi,
        playedMidi,
        // Signed, so "you were a semitone flat" is available rather than just
        // "wrong". Direction is most of the useful information here.
        semitoneError: playedMidi - expectedMidi,
      });
      expectedIndex += 1;
      playedIndex += 1;
    } else if (op === "delete") {
      steps.push({ kind: "missing", expectedIndex, expectedMidi: expected[expectedIndex] as number });
      expectedIndex += 1;
    } else {
      steps.push({ kind: "extra", afterIndex: expectedIndex - 1, playedMidi: played[playedIndex] as number });
      playedIndex += 1;
    }
  }

  const correctCount = steps.filter((step) => step.kind === "correct").length;
  const wrongCount = steps.filter((step) => step.kind === "wrong").length;
  const missingCount = steps.filter((step) => step.kind === "missing").length;
  const extraCount = steps.filter((step) => step.kind === "extra").length;
  const expectedCount = expected.length;

  // Extra notes count against the answer, but they cannot drive it below zero:
  // a learner who wrote twenty notes for a five-note prompt scores nothing, not
  // a negative number that would then poison an average.
  const penalised = Math.max(0, correctCount - extraCount);
  const accuracy = expectedCount === 0 ? 0 : Math.min(1, penalised / expectedCount);

  const firstError = steps.find((step) => step.kind !== "correct");
  const comparison: SequenceComparison = {
    steps,
    expectedCount,
    correctCount,
    wrongCount,
    missingCount,
    extraCount,
    accuracy,
    isExact: expectedCount > 0 && correctCount === expectedCount && steps.length === expectedCount,
  };

  if (firstError) {
    comparison.firstErrorIndex =
      firstError.kind === "extra" ? Math.max(0, firstError.afterIndex + 1) : firstError.expectedIndex;
  }
  return comparison;
}

// One sentence naming the first thing to fix. Deliberately specific: "the third
// note was a semitone low" is actionable, "62%" is not.
export function describeSequenceComparison(comparison: SequenceComparison): string {
  if (comparison.expectedCount === 0) return "There was nothing to compare.";
  if (comparison.isExact) return "Every note, in order.";

  const first = comparison.steps.find((step) => step.kind !== "correct");
  if (!first) return "Every note, in order.";

  if (first.kind === "wrong") {
    const distance = Math.abs(first.semitoneError);
    const direction = first.semitoneError < 0 ? "low" : "high";
    const gap = distance === 1 ? "a semitone" : distance === 2 ? "a tone" : `${distance} semitones`;
    return `Note ${first.expectedIndex + 1} was ${gap} ${direction}.`;
  }
  if (first.kind === "missing") return `Note ${first.expectedIndex + 1} is missing.`;
  return `There is an extra note after note ${first.afterIndex + 1}.`;
}
