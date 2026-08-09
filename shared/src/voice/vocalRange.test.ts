import { describe, expect, it } from "vitest";
import type { PitchFrame } from "./contour";
import {
  deriveVocalRange,
  describeRange,
  fitToRange,
  isSingable,
  normalizeVocalRange,
  referenceMidi,
  VOCAL_RANGE_VERSION,
  type VocalRange,
} from "./vocalRange";

function sweep(lowMidi: number, highMidi: number, count = 40): PitchFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    atSeconds: index * 0.02,
    midi: lowMidi + ((highMidi - lowMidi) * index) / (count - 1),
    confidence: 0.9,
    voiced: true,
    level: 0.2,
  }));
}

const BARITONE: VocalRange = { version: VOCAL_RANGE_VERSION, lowMidi: 48, highMidi: 64 };

describe("vocal range", () => {
  it("derives a range from a calibration take", () => {
    const range = deriveVocalRange(sweep(48, 65));

    expect(range?.lowMidi).toBeGreaterThanOrEqual(48);
    expect(range?.highMidi).toBeLessThanOrEqual(65);
    expect((range?.highMidi ?? 0) - (range?.lowMidi ?? 0)).toBeGreaterThan(10);
  });

  it("trims the extremes, so one squeak does not define the range", () => {
    const withSqueak = sweep(50, 62);
    (withSqueak[0] as PitchFrame).midi = 84;

    const range = deriveVocalRange(withSqueak);

    expect(range?.highMidi).toBeLessThan(70);
  });

  it("says nothing rather than guessing when there was too little singing", () => {
    expect(deriveVocalRange([])).toBeUndefined();
    expect(deriveVocalRange(sweep(60, 62, 4))).toBeUndefined();
    // A guessed range silently makes every later exercise unsingable.
    expect(deriveVocalRange(sweep(60, 61, 40))).toBeUndefined();
  });

  it("ignores unvoiced frames when working out a range", () => {
    const mostlySilent = sweep(48, 64).map((frame, index) =>
      index % 2 === 0 ? { ...frame, voiced: false, midi: 0 } : frame,
    );

    const range = deriveVocalRange(mostlySilent);

    expect(range?.lowMidi).toBeGreaterThan(40);
  });

  it("reads back a stored range and rejects a nonsensical one", () => {
    expect(normalizeVocalRange(BARITONE)).toEqual(BARITONE);
    expect(normalizeVocalRange({ ...BARITONE, version: 99 })).toBeUndefined();
    expect(normalizeVocalRange({ ...BARITONE, lowMidi: -5 })).toBeUndefined();
    expect(normalizeVocalRange({ ...BARITONE, highMidi: 200 })).toBeUndefined();
    expect(normalizeVocalRange({ ...BARITONE, highMidi: 49 })).toBeUndefined();
    expect(normalizeVocalRange("a range")).toBeUndefined();
    expect(normalizeVocalRange(null)).toBeUndefined();
  });

  it("moves a phrase into range by whole octaves, keeping its shape", () => {
    // Written for a soprano; sung by a baritone.
    const phrase = [72, 74, 76, 74, 72];
    const fitted = fitToRange(phrase, BARITONE);

    expect(fitted).toEqual([60, 62, 64, 62, 60]);
    // Intervals are untouched: it is still the same exercise.
    const shape = (notes: number[]) => notes.slice(1).map((midi, index) => midi - (notes[index] as number));
    expect(shape(fitted)).toEqual(shape(phrase));
  });

  it("leaves a phrase alone when it already sits in range", () => {
    expect(fitToRange([55, 57, 59], BARITONE)).toEqual([55, 57, 59]);
  });

  it("knows when a phrase is too wide to be sung in a range", () => {
    expect(isSingable([58, 60, 62], BARITONE)).toBe(true);
    // Two octaves of leaps do not fit a sixteen-semitone range at any octave.
    expect(isSingable([48, 72], BARITONE)).toBe(false);
  });

  it("offers the starting note as a reference, in the singer's octave", () => {
    expect(referenceMidi([72, 74], BARITONE)).toBe(60);
    expect(referenceMidi([], BARITONE)).toBeUndefined();
  });

  it("describes a range without claiming to know a voice type", () => {
    const description = describeRange(BARITONE);

    expect(description).toMatch(/octave/);
    // Five items of evidence is not enough to tell someone they are a tenor.
    for (const label of ["soprano", "alto", "tenor", "bass", "baritone"]) {
      expect(description.toLowerCase()).not.toContain(label);
    }
    expect(describeRange(undefined)).toMatch(/no range set/i);
  });

  it("handles an empty phrase without inventing notes", () => {
    expect(fitToRange([], BARITONE)).toEqual([]);
    expect(isSingable([], BARITONE)).toBe(true);
  });
});
