import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_POLICY, normalizeScoringPolicy } from "./scoringPolicy";

describe("normalizeScoringPolicy", () => {
  it("returns the default for junk or empty components", () => {
    expect(normalizeScoringPolicy(null)).toEqual(DEFAULT_SCORING_POLICY);
    expect(normalizeScoringPolicy({ components: ["nope"] }).components).toEqual(DEFAULT_SCORING_POLICY.components);
  });

  it("keeps valid components and clamps the threshold", () => {
    const policy = normalizeScoringPolicy({
      components: ["pitch", "rhythm", "pitch", "bogus"],
      passThreshold: 0.6,
      toleranceMs: 80,
      revealAnswer: true,
    });
    expect(policy.components).toEqual(["pitch", "rhythm"]);
    expect(policy.passThreshold).toBe(0.6);
    expect(policy.toleranceMs).toBe(80);
    expect(policy.revealAnswer).toBe(true);
  });

  it("falls back to the default threshold when out of range", () => {
    expect(normalizeScoringPolicy({ passThreshold: 2 }).passThreshold).toBe(DEFAULT_SCORING_POLICY.passThreshold);
    expect(normalizeScoringPolicy({ toleranceMs: -1 }).toleranceMs).toBeUndefined();
  });
});
