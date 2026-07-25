import { describe, expect, it } from "vitest";
import { measureLengthInQuarters, SCORE_MODEL_VERSION } from "./score";

describe("score model", () => {
  it("pins a persisted model version", () => {
    expect(SCORE_MODEL_VERSION).toBe(1);
  });

  it("computes measure length in quarter notes for simple and compound meters", () => {
    expect(measureLengthInQuarters({ beats: 4, beatUnit: 4 })).toEqual({ num: 4, den: 1 });
    expect(measureLengthInQuarters({ beats: 3, beatUnit: 4 })).toEqual({ num: 3, den: 1 });
    expect(measureLengthInQuarters({ beats: 6, beatUnit: 8 })).toEqual({ num: 3, den: 1 });
    expect(measureLengthInQuarters({ beats: 7, beatUnit: 8 })).toEqual({ num: 7, den: 2 });
  });
});
