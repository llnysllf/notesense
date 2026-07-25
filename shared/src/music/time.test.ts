import { describe, expect, it } from "vitest";
import {
  addRational,
  compareRational,
  DURATION,
  dotted,
  equalsRational,
  isRational,
  mulRational,
  rational,
  rationalToQuarters,
  rationalToTicks,
  subRational,
  TRANSPORT_V1,
  tuplet,
  ZERO,
} from "./time";

describe("rational", () => {
  it("reduces to lowest terms with a positive denominator", () => {
    expect(rational(2, 4)).toEqual({ num: 1, den: 2 });
    expect(rational(-1, -2)).toEqual({ num: 1, den: 2 });
    expect(rational(1, -2)).toEqual({ num: -1, den: 2 });
    expect(rational(0, 5)).toEqual({ num: 0, den: 1 });
    expect(rational(3)).toEqual({ num: 3, den: 1 });
  });

  it("rejects non-integer, non-finite, or zero-denominator input", () => {
    expect(rational(1.5, 2)).toBeUndefined();
    expect(rational(1, 0)).toBeUndefined();
    expect(rational(Number.NaN, 1)).toBeUndefined();
    expect(rational(1, 2.5)).toBeUndefined();
  });
});

describe("isRational", () => {
  it("accepts well-formed rationals and rejects everything else", () => {
    expect(isRational({ num: 1, den: 2 })).toBe(true);
    expect(isRational(ZERO)).toBe(true);
    expect(isRational({ num: 1, den: 0 })).toBe(false);
    expect(isRational({ num: 1.5, den: 2 })).toBe(false);
    expect(isRational({ num: 1 })).toBe(false);
    expect(isRational(null)).toBe(false);
    expect(isRational("1/2")).toBe(false);
  });
});

describe("arithmetic", () => {
  it("adds, subtracts, and multiplies with reduction", () => {
    expect(addRational({ num: 1, den: 2 }, { num: 1, den: 3 })).toEqual({ num: 5, den: 6 });
    expect(subRational({ num: 1, den: 2 }, { num: 1, den: 2 })).toEqual(ZERO);
    expect(mulRational({ num: 2, den: 3 }, { num: 3, den: 4 })).toEqual({ num: 1, den: 2 });
  });

  it("compares and tests equality by cross-multiplication", () => {
    expect(compareRational({ num: 1, den: 2 }, { num: 2, den: 3 })).toBeLessThan(0);
    expect(compareRational({ num: 3, den: 4 }, { num: 1, den: 2 })).toBeGreaterThan(0);
    expect(equalsRational({ num: 2, den: 4 }, { num: 1, den: 2 })).toBe(true);
    expect(equalsRational({ num: 1, den: 3 }, { num: 1, den: 2 })).toBe(false);
  });

  it("projects to a float in quarter notes for display", () => {
    expect(rationalToQuarters({ num: 1, den: 2 })).toBe(0.5);
  });
});

describe("note values", () => {
  it("expresses common durations in quarter-note units", () => {
    expect(DURATION.whole).toEqual({ num: 4, den: 1 });
    expect(DURATION.quarter).toEqual({ num: 1, den: 1 });
    expect(DURATION.sixteenth).toEqual({ num: 1, den: 4 });
  });

  it("dots and tuplets a base value", () => {
    expect(dotted(DURATION.quarter)).toEqual({ num: 3, den: 2 });
    // An eighth-note triplet member is three in the space of two eighths.
    expect(tuplet(DURATION.eighth, { num: 2, den: 3 })).toEqual({ num: 1, den: 3 });
  });
});

describe("rationalToTicks", () => {
  it("compiles sixteenths and triplets to exact integers at PPQ 960", () => {
    expect(TRANSPORT_V1).toEqual({ version: 1, ppq: 960 });
    expect(rationalToTicks(DURATION.quarter)).toBe(960);
    expect(rationalToTicks(DURATION.sixteenth)).toBe(240);
    expect(rationalToTicks({ num: 1, den: 3 })).toBe(320); // triplet-eighth
  });

  it("returns undefined when a value is not an integer tick count", () => {
    expect(rationalToTicks({ num: 1, den: 7 })).toBeUndefined();
    expect(rationalToTicks(DURATION.sixteenth, { version: 9, ppq: 10 })).toBeUndefined();
  });
});
