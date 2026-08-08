import { describe, expect, it } from "vitest";
import { canReplay, describeReplays, REPLAY_POLICIES, scoreTranscription } from "./transcription";

const QUARTER = 960;
const phrase = [
  { midi: 60, onsetTicks: 0 },
  { midi: 62, onsetTicks: QUARTER },
  { midi: 64, onsetTicks: QUARTER * 2 },
  { midi: 65, onsetTicks: QUARTER * 3 },
];

describe("transcription scoring", () => {
  it("gives full marks for the right notes in the right places", () => {
    const result = scoreTranscription(phrase, phrase);

    expect(result.isExact).toBe(true);
    expect(result.pitch.accuracy).toBe(1);
    expect(result.rhythmAccuracy).toBe(1);
    expect(result.total).toBeCloseTo(1, 5);
  });

  it("separates hearing the pitch from placing it", () => {
    // Right notes, one written on the wrong beat.
    const entered = phrase.map((note, index) => (index === 2 ? { ...note, onsetTicks: QUARTER * 2 + 480 } : note));
    const result = scoreTranscription(phrase, entered);

    expect(result.pitch.accuracy).toBe(1);
    expect(result.rhythmAccuracy).toBe(0.75);
    expect(result.isExact).toBe(false);
    expect(result.total).toBeLessThan(1);
    expect(result.total).toBeGreaterThan(0.8);
  });

  it("does not judge the rhythm of notes that were never written", () => {
    const entered = [phrase[0] as (typeof phrase)[number], phrase[1] as (typeof phrase)[number]];
    const result = scoreTranscription(phrase, entered);

    expect(result.alignedCount).toBe(2);
    // Both written notes are on the beat, but only half the phrase was written.
    expect(result.rhythmAccuracy).toBe(1);
    expect(result.total).toBeLessThan(0.6);
  });

  it("keeps a dropped note from discrediting everything after it", () => {
    const entered = [phrase[0], phrase[2], phrase[3]] as (typeof phrase)[number][];
    const result = scoreTranscription(phrase, entered);

    expect(result.pitch.correctCount).toBe(3);
    expect(result.pitch.missingCount).toBe(1);
    expect(result.rhythmAccuracy).toBe(1);
  });

  it("scores an empty transcription as zero rather than NaN", () => {
    const result = scoreTranscription(phrase, []);

    expect(result.total).toBe(0);
    expect(result.rhythmAccuracy).toBe(0);
    expect(Number.isNaN(result.total)).toBe(false);
  });

  it("has nothing to score when there was no phrase", () => {
    const result = scoreTranscription([], []);

    expect(result.total).toBe(0);
    expect(result.isExact).toBe(false);
  });
});

describe("replay policy", () => {
  it("does not limit replays while a learner is still learning", () => {
    expect(REPLAY_POLICIES.learn.maxReplays).toBe(Number.POSITIVE_INFINITY);
    expect(canReplay("learn", 99, true)).toBe(true);
    expect(describeReplays("learn", 5)).toBeUndefined();
  });

  it("limits practice replays so the exercise stays about listening", () => {
    expect(canReplay("practice", 2, true)).toBe(true);
    expect(canReplay("practice", 3, true)).toBe(false);
    expect(describeReplays("practice", 2)).toBe("1 replay left.");
    expect(describeReplays("practice", 3)).toBe("No replays left.");
  });

  it("plays a test phrase once, and not again once notes are being entered", () => {
    expect(canReplay("test", 0, false)).toBe(true);
    expect(canReplay("test", 1, false)).toBe(false);
    // Replaying mid-answer would measure something other than what was held.
    expect(canReplay("test", 0, true)).toBe(false);
  });

  it("counts down replays in plain words", () => {
    expect(describeReplays("practice", 0)).toBe("3 replays left.");
    expect(describeReplays("test", 0)).toBe("1 replay left.");
  });
});
