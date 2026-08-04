import { describe, expect, it } from "vitest";
import {
  cadenceMidi,
  chordMidi,
  intervalBySemitones,
  scaleMidi,
  CADENCES,
  CHORD_QUALITIES,
  INTERVALS,
  SCALES,
} from "./theory";

describe("ear theory vocabulary", () => {
  it("has no duplicate ids, so an answer can never be ambiguous", () => {
    for (const rows of [INTERVALS, CHORD_QUALITIES, SCALES, CADENCES]) {
      const ids = rows.map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("labels every row, because the generator and the answer screen read the same table", () => {
    for (const rows of [INTERVALS, CHORD_QUALITIES, SCALES, CADENCES]) {
      for (const row of rows) expect(row.label.length).toBeGreaterThan(0);
    }
  });

  it("covers every interval within an octave exactly once", () => {
    const semitones = INTERVALS.map((interval) => interval.semitones);

    expect(semitones).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("finds an interval by distance, in either direction", () => {
    expect(intervalBySemitones(7)?.id).toBe("perfect-5th");
    // A descending fifth is still a fifth.
    expect(intervalBySemitones(-7)?.id).toBe("perfect-5th");
    expect(intervalBySemitones(13)).toBeUndefined();
  });

  it("builds chords from their root", () => {
    const major = CHORD_QUALITIES.find((quality) => quality.id === "major");
    const diminished = CHORD_QUALITIES.find((quality) => quality.id === "diminished");

    expect(chordMidi(60, major as (typeof CHORD_QUALITIES)[number])).toEqual([60, 64, 67]);
    expect(chordMidi(60, diminished as (typeof CHORD_QUALITIES)[number])).toEqual([60, 63, 66]);
  });

  it("starts and ends every scale on the tonic", () => {
    for (const scale of SCALES) {
      const pitches = scaleMidi(60, scale);
      expect(pitches[0]).toBe(60);
      expect(pitches[pitches.length - 1]).toBe(72);
      // Ascending, with no repeated degree.
      expect([...pitches].sort((a, b) => a - b)).toEqual(pitches);
      expect(new Set(pitches).size).toBe(pitches.length);
    }
  });

  it("distinguishes the modes it claims to teach", () => {
    const fingerprints = SCALES.map((scale) => scaleMidi(60, scale).join(","));

    expect(new Set(fingerprints).size).toBe(SCALES.length);
  });

  it("builds each cadence as two chords in the key", () => {
    for (const cadence of CADENCES) {
      const chords = cadenceMidi(60, cadence);
      expect(chords).toHaveLength(2);
      for (const chord of chords) expect(chord.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("resolves the cadences that resolve, and does not claim the others do", () => {
    const byId = new Map(CADENCES.map((cadence) => [cadence.id, cadenceMidi(60, cadence)]));

    // Perfect and plagal land on the tonic chord; half and deceptive do not.
    expect(byId.get("authentic")?.[1]).toEqual([60, 64, 67]);
    expect(byId.get("plagal")?.[1]).toEqual([60, 64, 67]);
    expect(byId.get("half")?.[1]).not.toEqual([60, 64, 67]);
    expect(byId.get("deceptive")?.[1]).not.toEqual([60, 64, 67]);
  });
});
