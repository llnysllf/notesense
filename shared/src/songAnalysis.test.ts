import { describe, expect, it } from "vitest";
import { normalizeSong } from "./songData";
import {
  compareSongsByDifficulty,
  getEventMeasureStarts,
  getMeasureLengthInEighths,
  getSongDifficulty,
  getSongNoteRange,
} from "./songAnalysis";

function makeSong(events: unknown[], title = "Made", timeSignature?: unknown): ReturnType<typeof normalizeSong> {
  return normalizeSong({ title, events, timeSignature }, "builtin");
}

describe("getSongNoteRange", () => {
  it("finds the lowest and highest notes across events and chords", () => {
    const song = makeSong([
      { noteIds: ["E4"], duration: "quarter" },
      { noteIds: ["G3", "C5"], duration: "quarter" },
      { noteIds: ["A4"], duration: "quarter" },
      { noteIds: ["B4"], duration: "quarter" },
    ]);

    expect(getSongNoteRange(song!)).toEqual({ lowestNoteId: "G3", highestNoteId: "C5" });
  });
});

describe("getSongDifficulty", () => {
  it("grades a short narrow natural melody as beginner", () => {
    const song = makeSong([
      { noteIds: ["C4"], duration: "quarter" },
      { noteIds: ["D4"], duration: "quarter" },
      { noteIds: ["E4"], duration: "quarter" },
      { noteIds: ["G4"], duration: "half" },
    ]);
    expect(getSongDifficulty(song!)).toBe("beginner");
  });

  it("grades wider or eighth-note melodies as intermediate", () => {
    const song = makeSong([
      { noteIds: ["G3"], duration: "quarter" },
      { noteIds: ["C4"], duration: "eighth" },
      { noteIds: ["E4"], duration: "eighth" },
      { noteIds: ["G4"], duration: "quarter" },
    ]);
    expect(getSongDifficulty(song!)).toBe("intermediate");
  });

  it("grades accidental-heavy wide melodies as advanced", () => {
    const song = makeSong(
      Array.from({ length: 20 }, (_, index) => ({
        noteIds: [index % 2 === 0 ? "C4" : index % 3 === 0 ? "F#5" : "E5"],
        duration: index % 4 === 0 ? "eighth" : "quarter",
      })),
    );
    expect(getSongDifficulty(song!)).toBe("advanced");
  });
});

describe("compareSongsByDifficulty", () => {
  it("orders by difficulty then by length", () => {
    const easyShort = makeSong(
      [
        { noteIds: ["C4"], duration: "quarter" },
        { noteIds: ["D4"], duration: "quarter" },
        { noteIds: ["E4"], duration: "quarter" },
        { noteIds: ["F4"], duration: "quarter" },
      ],
      "Easy Short",
    )!;
    const easyLong = makeSong(
      Array.from({ length: 30 }, () => ({ noteIds: ["C4"], duration: "quarter" })),
      "Easy Long",
    )!;
    const hard = makeSong(
      Array.from({ length: 20 }, (_, index) => ({
        noteIds: [index % 2 === 0 ? "C4" : "F#5"],
        duration: "eighth",
      })),
      "Hard",
    )!;

    const sorted = [hard, easyLong, easyShort].sort(compareSongsByDifficulty);
    expect(sorted.map((song) => song.title)).toEqual(["Easy Short", "Easy Long", "Hard"]);
  });
});

describe("getMeasureLengthInEighths", () => {
  it("computes measure length for simple and compound meters", () => {
    expect(getMeasureLengthInEighths({ beatsPerMeasure: 4, beatUnit: "quarter" })).toBe(8);
    expect(getMeasureLengthInEighths({ beatsPerMeasure: 3, beatUnit: "quarter" })).toBe(6);
    expect(getMeasureLengthInEighths({ beatsPerMeasure: 6, beatUnit: "eighth" })).toBe(6);
  });
});

describe("getEventMeasureStarts", () => {
  it("marks a barline every four quarter-note beats in 4/4", () => {
    const song = makeSong(
      Array.from({ length: 9 }, () => ({ noteIds: ["C4"], duration: "quarter" })),
      "Four Four",
    )!;

    // Quarter notes: beats 1,2,3,4 | 5,6,7,8 | 9 -> measure starts at index 0, 4, 8.
    expect(getEventMeasureStarts(song)).toEqual([true, false, false, false, true, false, false, false, true]);
  });

  it("marks a barline every three quarter-note beats in 3/4", () => {
    const song = makeSong(
      Array.from({ length: 7 }, () => ({ noteIds: ["C4"], duration: "quarter" })),
      "Three Four",
      { beatsPerMeasure: 3, beatUnit: "quarter" },
    )!;

    expect(getEventMeasureStarts(song)).toEqual([true, false, false, true, false, false, true]);
  });

  it("accounts for half and whole notes taking multiple beats", () => {
    const song = makeSong(
      [
        { noteIds: ["C4"], duration: "half" }, // 2 beats
        { noteIds: ["D4"], duration: "half" }, // 2 beats -> measure 1 complete (4 beats)
        { noteIds: ["E4"], duration: "whole" }, // 4 beats -> measure 2 complete
        { noteIds: ["F4"], duration: "quarter" }, // measure 3 starts
      ],
      "Mixed Durations",
    )!;

    expect(getEventMeasureStarts(song)).toEqual([true, false, true, true]);
  });

  it("marks a barline every six eighth notes in a compound 6/8 meter", () => {
    const song = makeSong(
      Array.from({ length: 8 }, () => ({ noteIds: ["C4"], duration: "eighth" })),
      "Six Eight",
      { beatsPerMeasure: 6, beatUnit: "eighth" },
    )!;

    expect(getEventMeasureStarts(song)).toEqual([true, false, false, false, false, false, true, false]);
  });
});
