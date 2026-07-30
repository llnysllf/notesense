import { describe, expect, it } from "vitest";
import { countInSeconds } from "./metronome";

describe("countInSeconds", () => {
  it("reports how long the learner waits before playing", () => {
    // One bar of 4/4 at 120bpm is two seconds.
    expect(countInSeconds(120, 4)).toBeCloseTo(2, 6);
    expect(countInSeconds(60, 3, 2)).toBeCloseTo(6, 6);
  });

  it("treats a missing count-in and a nonsensical tempo safely", () => {
    expect(countInSeconds(120, 4, 0)).toBe(0);
    expect(countInSeconds(0, 4, 1)).toBeCloseTo(240, 6);
  });
});
