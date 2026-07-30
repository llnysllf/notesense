import { describe, expect, it } from "vitest";
import {
  getReadingModeRules,
  isReadingMode,
  normalizeReadingMode,
  READING_MODE_IDS,
  READING_MODES,
} from "./readingMode";
import {
  buildReplaySet,
  classifyReadingMistake,
  describeMistakes,
  groupMisses,
  MAX_REPLAY_ITEMS,
  type ReadingMiss,
} from "./mistakes";
import { buildReadingTestForm, scoreReadingTest } from "./testForm";

describe("reading modes", () => {
  it("declares all four ways to work on reading", () => {
    expect(READING_MODE_IDS.sort()).toEqual(["custom", "learn", "practice", "test"]);
    for (const id of READING_MODE_IDS) {
      const rules = getReadingModeRules(id);
      expect(rules.id).toBe(id);
      expect(rules.label.length).toBeGreaterThan(0);
      expect(rules.summary.length).toBeGreaterThan(0);
    }
  });

  it("keeps a test from behaving like practice", () => {
    const test = READING_MODES.test;
    // Adapting or revealing mid-test would change what the test measures.
    expect(test.adaptiveSelection).toBe(false);
    expect(test.revealAnswer).toBe(false);
    expect(test.allowHints).toBe(false);
    expect(test.unseenMaterial).toBe(true);
    // A fixed length is what makes two sittings comparable.
    expect(test.fixedPromptCount).toBeGreaterThan(0);
    // Assessment items must not inflate practice evidence.
    expect(test.contributesEvidence).toBe(false);
  });

  it("lets practice adapt and learn assist", () => {
    expect(READING_MODES.practice.adaptiveSelection).toBe(true);
    expect(READING_MODES.practice.allowHints).toBe(false);
    expect(READING_MODES.learn.allowHints).toBe(true);
    expect(READING_MODES.learn.adaptiveSelection).toBe(false);
    expect(READING_MODES.custom.allowCustomRange).toBe(true);
    expect(READING_MODES.practice.allowCustomRange).toBe(false);
  });

  it("normalizes untrusted mode values to practice", () => {
    expect(isReadingMode("test")).toBe(true);
    expect(isReadingMode("nope")).toBe(false);
    expect(normalizeReadingMode("learn")).toBe("learn");
    expect(normalizeReadingMode(42)).toBe("practice");
  });
});

describe("classifyReadingMistake", () => {
  it("never labels a correct answer", () => {
    expect(classifyReadingMistake(60, 60)).toBeUndefined();
  });

  it("names the shape of the error", () => {
    expect(classifyReadingMistake(60, 72)).toBe("wrong-octave");
    expect(classifyReadingMistake(60, 48)).toBe("wrong-octave");
    expect(classifyReadingMistake(60, 61)).toBe("semitone-slip");
    expect(classifyReadingMistake(60, 62)).toBe("step-slip");
    expect(classifyReadingMistake(60, 63)).toBe("third-slip");
    expect(classifyReadingMistake(60, 64)).toBe("third-slip");
    expect(classifyReadingMistake(60, 67)).toBe("distant-miss");
  });
});

describe("grouping and replay", () => {
  const miss = (expectedMidi: number, answeredMidi: number): ReadingMiss => ({
    expectedMidi,
    answeredMidi,
    code: classifyReadingMistake(expectedMidi, answeredMidi) ?? "distant-miss",
  });

  it("groups by the note that was on the staff, most-missed first", () => {
    const groups = groupMisses([miss(60, 62), miss(60, 62), miss(64, 65), miss(60, 72)]);

    expect(groups[0]).toMatchObject({ expectedMidi: 60, misses: 3, dominantCode: "step-slip" });
    expect(groups[1]).toMatchObject({ expectedMidi: 64, misses: 1 });
  });

  it("builds a short corrective set and caps it", () => {
    expect(buildReplaySet([miss(60, 61), miss(64, 65)])).toEqual([60, 64]);

    const many = Array.from({ length: 12 }, (_, index) => miss(50 + index, 50 + index + 1));
    expect(buildReplaySet(many)).toHaveLength(MAX_REPLAY_ITEMS);
    expect(buildReplaySet(many, 2)).toHaveLength(2);
    expect(buildReplaySet(many, -1)).toHaveLength(0);
  });

  it("has nothing to replay after a clean round", () => {
    expect(buildReplaySet([])).toEqual([]);
    expect(groupMisses([])).toEqual([]);
    expect(describeMistakes([])).toBeUndefined();
  });

  it("summarises the dominant problem in plain language", () => {
    expect(describeMistakes([miss(60, 72)])).toBe("Wrong octave — missed 1 time.");
    expect(describeMistakes([miss(60, 62), miss(60, 62)])).toBe("Step slip — missed 2 times.");
  });
});

describe("buildReadingTestForm", () => {
  const spec = { lowMidi: 60, highMidi: 72, promptCount: 20, seed: "form-a" };

  it("is deterministic in its seed, so two sittings are comparable", () => {
    expect(buildReadingTestForm(spec)).toEqual(buildReadingTestForm(spec));
    expect(buildReadingTestForm({ ...spec, seed: "form-b" }).prompts).not.toEqual(buildReadingTestForm(spec).prompts);
  });

  it("stays inside the requested range and length", () => {
    const form = buildReadingTestForm(spec);
    expect(form.prompts).toHaveLength(20);
    for (const midi of form.prompts) {
      expect(midi).toBeGreaterThanOrEqual(60);
      expect(midi).toBeLessThanOrEqual(72);
    }
  });

  it("never repeats a pitch back to back", () => {
    const form = buildReadingTestForm({ ...spec, promptCount: 40 });
    for (let index = 1; index < form.prompts.length; index += 1) {
      expect(form.prompts[index]).not.toBe(form.prompts[index - 1]);
    }
  });

  it("can draw from an explicit prompt pool inside the requested range", () => {
    const form = buildReadingTestForm({
      ...spec,
      allowedMidis: [60, 64, 67, 76],
      promptCount: 20,
      seed: "pool",
    });

    expect(form.prompts.every((midi) => [60, 64, 67].includes(midi))).toBe(true);
    for (let index = 1; index < form.prompts.length; index += 1) {
      expect(form.prompts[index]).not.toBe(form.prompts[index - 1]);
    }
  });

  it("tolerates an inverted range and clamps absurd lengths", () => {
    const inverted = buildReadingTestForm({ lowMidi: 72, highMidi: 60, promptCount: 5, seed: "x" });
    expect(inverted.lowMidi).toBe(60);
    expect(inverted.highMidi).toBe(72);

    expect(buildReadingTestForm({ ...spec, promptCount: 0 }).prompts).toHaveLength(1);
    expect(buildReadingTestForm({ ...spec, promptCount: 500 }).prompts).toHaveLength(60);
  });

  it("steps down instead of up when a repeat lands on the top note", () => {
    // A two-note range forces the repeat guard to take both directions.
    const form = buildReadingTestForm({ lowMidi: 71, highMidi: 72, promptCount: 12, seed: "edge" });
    for (let index = 1; index < form.prompts.length; index += 1) {
      expect(form.prompts[index]).not.toBe(form.prompts[index - 1]);
    }
    expect(new Set(form.prompts)).toEqual(new Set([71, 72]));
  });

  it("handles a single-note range without looping forever", () => {
    const form = buildReadingTestForm({ lowMidi: 60, highMidi: 60, promptCount: 3, seed: "one" });
    expect(form.prompts).toEqual([60, 60, 60]);
  });
});

describe("scoreReadingTest", () => {
  it("reports accuracy and a median response time", () => {
    const result = scoreReadingTest([
      { correct: true, responseMs: 1000 },
      { correct: false, responseMs: 3000 },
      { correct: true, responseMs: 2000 },
    ]);

    expect(result).toMatchObject({ promptCount: 3, correct: 2, medianResponseMs: 2000 });
    expect(result.accuracy).toBeCloseTo(2 / 3, 5);
  });

  it("averages the middle pair for an even count", () => {
    expect(
      scoreReadingTest([
        { correct: true, responseMs: 1000 },
        { correct: true, responseMs: 2000 },
      ]).medianResponseMs,
    ).toBe(1500);
  });

  it("returns zeroes rather than NaN for an empty run", () => {
    expect(scoreReadingTest([])).toEqual({ promptCount: 0, correct: 0, accuracy: 0, medianResponseMs: 0 });
  });
});
