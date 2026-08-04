import { describe, expect, it } from "vitest";
import { compareSequences, describeSequenceComparison } from "./sequence";

describe("sequence comparison", () => {
  it("recognises an exact answer", () => {
    const result = compareSequences([60, 62, 64], [60, 62, 64]);

    expect(result.isExact).toBe(true);
    expect(result.accuracy).toBe(1);
    expect(result.firstErrorIndex).toBeUndefined();
    expect(describeSequenceComparison(result)).toBe("Every note, in order.");
  });

  it("reports a wrong note as wrong, not as one missed and one invented", () => {
    const result = compareSequences([60, 62, 64], [60, 63, 64]);

    expect(result.steps.map((step) => step.kind)).toEqual(["correct", "wrong", "correct"]);
    expect(result.missingCount).toBe(0);
    expect(result.extraCount).toBe(0);
    expect(result.firstErrorIndex).toBe(1);
  });

  it("says which way a wrong note was out, because direction is the useful part", () => {
    const flat = compareSequences([60, 62], [60, 61]);
    const sharp = compareSequences([60, 62], [60, 64]);

    expect(describeSequenceComparison(flat)).toBe("Note 2 was a semitone low.");
    expect(describeSequenceComparison(sharp)).toBe("Note 2 was a tone high.");
  });

  it("does not let one missed note discredit everything after it", () => {
    // The whole reason alignment exists: index-by-index comparison would call
    // nine of these ten notes wrong.
    const expected = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
    const played = [60, 62, 65, 67, 69, 71, 72, 74, 76];

    const result = compareSequences(expected, played);

    expect(result.correctCount).toBe(9);
    expect(result.missingCount).toBe(1);
    expect(result.wrongCount).toBe(0);
    expect(result.accuracy).toBeCloseTo(0.9, 5);
    expect(describeSequenceComparison(result)).toBe("Note 3 is missing.");
  });

  it("handles an extra note without shifting everything after it", () => {
    const result = compareSequences([60, 62, 64], [60, 61, 62, 64]);

    expect(result.correctCount).toBe(3);
    expect(result.extraCount).toBe(1);
    expect(result.missingCount).toBe(0);
    expect(describeSequenceComparison(result)).toMatch(/extra note after note 1/);
  });

  it("points at the first thing to fix when there are several errors", () => {
    const result = compareSequences([60, 62, 64, 65], [60, 63, 64, 66]);

    expect(result.firstErrorIndex).toBe(1);
    expect(result.wrongCount).toBe(2);
  });

  it("counts repeated notes rather than collapsing them", () => {
    const result = compareSequences([60, 60, 60], [60, 60]);

    expect(result.correctCount).toBe(2);
    expect(result.missingCount).toBe(1);
    expect(result.accuracy).toBeCloseTo(2 / 3, 5);
  });

  it("scores an empty answer as nothing, without dividing by zero", () => {
    const result = compareSequences([60, 62], []);

    expect(result.correctCount).toBe(0);
    expect(result.missingCount).toBe(2);
    expect(result.accuracy).toBe(0);
    expect(Number.isNaN(result.accuracy)).toBe(false);
  });

  it("has nothing to say about an empty prompt", () => {
    const result = compareSequences([], []);

    expect(result.accuracy).toBe(0);
    expect(result.isExact).toBe(false);
    expect(describeSequenceComparison(result)).toBe("There was nothing to compare.");
  });

  it("does not reward flooding the answer with notes", () => {
    const result = compareSequences([60, 62, 64], [60, 61, 62, 63, 64, 65, 66, 67, 68]);

    // Every expected note appears, but so do six that do not belong.
    expect(result.correctCount).toBe(3);
    expect(result.extraCount).toBe(6);
    expect(result.accuracy).toBe(0);
  });

  it("never reports a negative score", () => {
    const result = compareSequences(
      [60],
      Array.from({ length: 40 }, (_, index) => 60 + index),
    );

    expect(result.accuracy).toBeGreaterThanOrEqual(0);
  });

  it("treats a completely different answer of the same length as all wrong", () => {
    const result = compareSequences([60, 62, 64], [70, 72, 74]);

    expect(result.wrongCount).toBe(3);
    expect(result.correctCount).toBe(0);
    expect(result.accuracy).toBe(0);
  });

  it("aligns a transposed answer as wrong notes rather than as churn", () => {
    // Everything a tone high: three substitutions, not three deletes and three
    // inserts, so the feedback can say "you started on the wrong note".
    const result = compareSequences([60, 62, 64], [62, 64, 66]);

    expect(result.wrongCount).toBe(3);
    expect(result.missingCount).toBe(0);
    expect(result.extraCount).toBe(0);
  });
});
