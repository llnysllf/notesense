import { describe, expect, it } from "vitest";
import { rationalToQuarters, TRANSPORT_V1 } from "../music/time";
import {
  generateRhythmPattern,
  patternLengthTicks,
  patternOnsetTicks,
  RHYTHM_VOCABULARIES,
  type RhythmVocabulary,
} from "./pattern";
import { describeRhythm, gradeRhythm, toleranceForTempo } from "./grade";

const FOUR_FOUR = { beats: 4, beatUnit: 4 } as const;
const SIX_EIGHT = { beats: 6, beatUnit: 8 } as const;

describe("generateRhythmPattern", () => {
  it("is deterministic in its seed", () => {
    const spec = { meter: FOUR_FOUR, bars: 2, vocabulary: "eighths" as const, seed: "a" };
    expect(generateRhythmPattern(spec)).toEqual(generateRhythmPattern(spec));
    expect(generateRhythmPattern({ ...spec, seed: "b" }).events).not.toEqual(generateRhythmPattern(spec).events);
  });

  it("fills every bar exactly, never overrunning the meter", () => {
    for (const vocabulary of RHYTHM_VOCABULARIES) {
      for (let seed = 0; seed < 40; seed += 1) {
        const pattern = generateRhythmPattern({
          meter: FOUR_FOUR,
          bars: 2,
          vocabulary: vocabulary as RhythmVocabulary,
          seed: `s${seed}`,
        });
        const total = pattern.events.reduce((sum, event) => sum + rationalToQuarters(event.duration), 0);
        // Two bars of 4/4 is 8 quarter notes.
        expect(total).toBeCloseTo(8, 6);
      }
    }
  });

  it("fills a compound meter exactly", () => {
    const pattern = generateRhythmPattern({ meter: SIX_EIGHT, bars: 2, vocabulary: "eighths", seed: "compound" });
    const total = pattern.events.reduce((sum, event) => sum + rationalToQuarters(event.duration), 0);
    // 6/8 is three quarter notes per bar.
    expect(total).toBeCloseTo(6, 6);
  });

  it("keeps triplets exact rather than rounding them", () => {
    const pattern = generateRhythmPattern({ meter: FOUR_FOUR, bars: 2, vocabulary: "triplets", seed: "t" });
    const tripletish = pattern.events.filter((event) => event.duration.den === 3);

    for (const event of tripletish) {
      // A triplet eighth is exactly a third of a quarter, and at PPQ 960 that
      // is an integer tick count. This is the whole reason for rational time.
      expect(rationalToQuarters(event.duration)).toBeCloseTo(1 / 3, 10);
    }
    const total = pattern.events.reduce((sum, event) => sum + rationalToQuarters(event.duration), 0);
    expect(total).toBeCloseTo(8, 6);
  });

  it("clamps absurd bar counts and always produces something playable", () => {
    expect(generateRhythmPattern({ meter: FOUR_FOUR, bars: 0, vocabulary: "simple", seed: "x" }).bars).toBe(1);
    expect(generateRhythmPattern({ meter: FOUR_FOUR, bars: 99, vocabulary: "simple", seed: "x" }).bars).toBe(8);
    expect(
      generateRhythmPattern({ meter: FOUR_FOUR, bars: 1, vocabulary: "simple", seed: "x" }).events.length,
    ).toBeGreaterThan(0);
  });

  it("only includes rests when asked", () => {
    const without = generateRhythmPattern({ meter: FOUR_FOUR, bars: 4, vocabulary: "eighths", seed: "r" });
    expect(without.events.some((event) => event.isRest)).toBe(false);

    const withRests = generateRhythmPattern({
      meter: FOUR_FOUR,
      bars: 8,
      vocabulary: "eighths",
      seed: "r",
      allowRests: true,
    });
    expect(withRests.events.some((event) => event.isRest)).toBe(true);
  });
});

describe("bar filling edge cases", () => {
  it("consumes a bar that no cell can fill, keeping later offsets aligned", () => {
    // A 1/16 bar is shorter than any cell in the simple vocabulary, so the bar
    // yields no events but must still advance the cursor by a full bar.
    const pattern = generateRhythmPattern({
      meter: { beats: 1, beatUnit: 16 },
      bars: 2,
      vocabulary: "simple",
      seed: "tiny",
    });

    expect(pattern.events).toHaveLength(0);
    expect(patternOnsetTicks(pattern)).toEqual([]);
  });

  it("omits rests from the onsets a learner has to play", () => {
    const pattern = generateRhythmPattern({
      meter: FOUR_FOUR,
      bars: 8,
      vocabulary: "eighths",
      seed: "r",
      allowRests: true,
    });

    const rests = pattern.events.filter((event) => event.isRest).length;
    expect(rests).toBeGreaterThan(0);
    expect(patternOnsetTicks(pattern)).toHaveLength(pattern.events.length - rests);
  });
});

describe("patternOnsetTicks / patternLengthTicks", () => {
  it("compiles onsets to exact integer ticks and skips rests", () => {
    const pattern = generateRhythmPattern({ meter: FOUR_FOUR, bars: 1, vocabulary: "simple", seed: "onsets" });
    const ticks = patternOnsetTicks(pattern);

    expect(ticks.length).toBe(pattern.events.filter((event) => !event.isRest).length);
    for (const tick of ticks) expect(Number.isInteger(tick)).toBe(true);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });

  it("reports the pattern length from the meter and bar count", () => {
    const pattern = generateRhythmPattern({ meter: FOUR_FOUR, bars: 2, vocabulary: "simple", seed: "len" });
    // Two bars of 4/4 = 8 quarters = 8 * 960 ticks.
    expect(patternLengthTicks(pattern)).toBe(8 * TRANSPORT_V1.ppq);
    expect(
      patternLengthTicks(generateRhythmPattern({ meter: SIX_EIGHT, bars: 1, vocabulary: "simple", seed: "l" })),
    ).toBe(3 * TRANSPORT_V1.ppq);
  });
});

describe("toleranceForTempo", () => {
  it("scales with the beat but stays humanly possible and musically meaningful", () => {
    // A quarter of a beat at 120bpm is 125ms.
    expect(toleranceForTempo(120)).toBeCloseTo(125, 5);
    // Fast tempi floor rather than shrinking to nothing.
    expect(toleranceForTempo(400)).toBe(60);
    // Slow tempi cap rather than accepting anything.
    expect(toleranceForTempo(20)).toBe(200);
  });
});

describe("gradeRhythm", () => {
  // Four quarter notes at 120bpm: one every 0.5s.
  const expectedTicks = [0, 960, 1920, 2880];
  const perfect = [0, 0.5, 1, 1.5];

  it("scores a perfect performance", () => {
    const score = gradeRhythm({ expectedTicks, playedSeconds: perfect, bpm: 120 });

    expect(score.onTime).toBe(4);
    expect(score.onsetAccuracy).toBe(1);
    expect(score.extraTaps).toBe(0);
    expect(score.meanErrorMs).toBeCloseTo(0, 6);
    expect(score.completion).toBe(1);
    expect(score.pulseSteadiness).toBeCloseTo(1, 6);
    expect(score.onsets.every((onset) => onset.verdict === "on-time")).toBe(true);
  });

  it("separates a steady offset from unsteady playing", () => {
    // Consistently 80ms early: accurate pulse, wrong alignment.
    const steadyEarly = gradeRhythm({ expectedTicks, playedSeconds: perfect.map((t) => t - 0.08), bpm: 120 });
    expect(steadyEarly.meanErrorMs).toBeCloseTo(-80, 0);
    expect(steadyEarly.pulseSteadiness).toBeCloseTo(1, 4);

    // Scattered around the beat: same rough accuracy, no steadiness.
    const scattered = gradeRhythm({
      expectedTicks,
      playedSeconds: [0.09, 0.42, 1.1, 1.42],
      bpm: 120,
    });
    expect(scattered.pulseSteadiness).toBeLessThan(steadyEarly.pulseSteadiness);
  });

  it("keeps near misses as actionable early or late verdicts", () => {
    const early = gradeRhythm({ expectedTicks: [0], playedSeconds: [-0.18], bpm: 120 });
    const late = gradeRhythm({ expectedTicks: [0], playedSeconds: [0.18], bpm: 120 });

    expect(early.onsets[0]?.verdict).toBe("early");
    expect(late.onsets[0]?.verdict).toBe("late");
  });

  it("marks onsets nothing was played for as missed", () => {
    const score = gradeRhythm({ expectedTicks, playedSeconds: [0, 0.5], bpm: 120 });

    expect(score.onsets.map((onset) => onset.verdict)).toEqual(["on-time", "on-time", "missed", "missed"]);
    expect(score.onsetAccuracy).toBe(0.5);
    // They stopped halfway rather than played badly.
    expect(score.completion).toBe(0.5);
  });

  it("counts taps that match nothing", () => {
    const score = gradeRhythm({ expectedTicks, playedSeconds: [0, 0.25, 0.5, 1, 1.5], bpm: 120 });

    expect(score.extraTaps).toBe(1);
    expect(score.onTime).toBe(4);
  });

  it("corrects for measured input latency", () => {
    // Every tap arrives 100ms late because of the device, not the learner.
    const late = perfect.map((t) => t + 0.1);
    const uncorrected = gradeRhythm({ expectedTicks, playedSeconds: late, bpm: 120 });
    const corrected = gradeRhythm({ expectedTicks, playedSeconds: late, bpm: 120, latencyMs: 100 });

    expect(uncorrected.meanErrorMs).toBeCloseTo(100, 0);
    expect(corrected.meanErrorMs).toBeCloseTo(0, 6);
    expect(corrected.onTime).toBe(4);
  });

  it("respects the tempo when projecting expected onsets", () => {
    // At 60bpm the same ticks are one second apart.
    const score = gradeRhythm({ expectedTicks, playedSeconds: [0, 1, 2, 3], bpm: 60 });
    expect(score.onTime).toBe(4);
    expect(score.onsets[1]?.expectedSeconds).toBeCloseTo(1, 6);
  });

  it("does not report NaN for an empty run", () => {
    const score = gradeRhythm({ expectedTicks: [], playedSeconds: [], bpm: 120 });
    expect(score).toMatchObject({ onTime: 0, onsetAccuracy: 0, meanErrorMs: 0, completion: 0, extraTaps: 0 });

    const nothingPlayed = gradeRhythm({ expectedTicks, playedSeconds: [], bpm: 120 });
    expect(nothingPlayed.onsetAccuracy).toBe(0);
    expect(nothingPlayed.meanErrorMs).toBe(0);
    expect(nothingPlayed.pulseSteadiness).toBe(0);
  });

  it("never matches one tap to two onsets", () => {
    const score = gradeRhythm({ expectedTicks: [0, 960], playedSeconds: [0.24], bpm: 120, toleranceMs: 300 });
    const matched = score.onsets.filter((onset) => onset.playedSeconds !== undefined);
    expect(matched).toHaveLength(1);
  });
});

describe("describeRhythm", () => {
  const tolerance = toleranceForTempo(120);

  it("names a systematic offset before anything else", () => {
    const early = gradeRhythm({ expectedTicks: [0, 960], playedSeconds: [-0.09, 0.41], bpm: 120 });
    expect(describeRhythm(early, tolerance)).toMatch(/early/i);

    const late = gradeRhythm({ expectedTicks: [0, 960], playedSeconds: [0.09, 0.59], bpm: 120 });
    expect(describeRhythm(late, tolerance)).toMatch(/late/i);
  });

  it("says when nothing landed, and stays quiet with nothing to grade", () => {
    const nothing = gradeRhythm({ expectedTicks: [0, 960], playedSeconds: [], bpm: 120 });
    expect(describeRhythm(nothing, tolerance)).toMatch(/counting the pulse/i);
    expect(describeRhythm(gradeRhythm({ expectedTicks: [], playedSeconds: [], bpm: 120 }), tolerance)).toBeUndefined();
  });

  it("praises a clean run", () => {
    const perfect = gradeRhythm({ expectedTicks: [0, 960, 1920], playedSeconds: [0, 0.5, 1], bpm: 120 });
    expect(describeRhythm(perfect, tolerance)).toBe("Steady and in time.");
  });
});
