import { describe, expect, it } from "vitest";
import { isSpelledPitch, isStep, midiToSpelled, noteIdToSpelled, spelledToMidi, spelledToNoteId } from "./pitch";

describe("spelledToMidi", () => {
  it("sounds spelled pitches, including accidentals and enharmonics", () => {
    expect(spelledToMidi({ step: "C", alter: 0, octave: 4 })).toBe(60);
    expect(spelledToMidi({ step: "A", alter: 0, octave: 0 })).toBe(21);
    expect(spelledToMidi({ step: "C", alter: 0, octave: 8 })).toBe(108);
    expect(spelledToMidi({ step: "F", alter: 1, octave: 3 })).toBe(54);
    // E# sounds the same as F natural.
    expect(spelledToMidi({ step: "E", alter: 1, octave: 4 })).toBe(65);
  });
});

describe("midiToSpelled", () => {
  it("returns the canonical sharp spelling within the 88-key range", () => {
    expect(midiToSpelled(60)).toEqual({ step: "C", alter: 0, octave: 4 });
    expect(midiToSpelled(61)).toEqual({ step: "C", alter: 1, octave: 4 });
    expect(midiToSpelled(54)).toEqual({ step: "F", alter: 1, octave: 3 });
  });

  it("rejects out-of-range and non-integer midi numbers", () => {
    expect(midiToSpelled(20)).toBeUndefined();
    expect(midiToSpelled(109)).toBeUndefined();
    expect(midiToSpelled(60.5)).toBeUndefined();
  });
});

describe("noteIdToSpelled", () => {
  it("parses the app note-id vocabulary", () => {
    expect(noteIdToSpelled("C4")).toEqual({ step: "C", alter: 0, octave: 4 });
    expect(noteIdToSpelled("F#3")).toEqual({ step: "F", alter: 1, octave: 3 });
  });

  it("rejects ids outside the keyboard vocabulary", () => {
    expect(noteIdToSpelled("H9")).toBeUndefined();
    expect(noteIdToSpelled("C9")).toBeUndefined(); // above C8
    expect(noteIdToSpelled("Cb4")).toBeUndefined(); // flats are not part of the id set
  });
});

describe("spelledToNoteId", () => {
  it("round-trips sharp/natural note ids", () => {
    expect(spelledToNoteId({ step: "F", alter: 1, octave: 3 })).toBe("F#3");
    expect(spelledToNoteId({ step: "C", alter: 0, octave: 4 })).toBe("C4");
  });

  it("collapses enharmonic spellings to their canonical id", () => {
    expect(spelledToNoteId({ step: "E", alter: 1, octave: 4 })).toBe("F4");
    expect(spelledToNoteId({ step: "C", alter: -1, octave: 4 })).toBe("B3");
  });

  it("returns undefined when the sounding pitch has no 88-key id", () => {
    expect(spelledToNoteId({ step: "C", alter: -2, octave: 0 })).toBeUndefined();
  });
});

describe("type guards", () => {
  it("validates steps and spelled pitches", () => {
    expect(isStep("C")).toBe(true);
    expect(isStep("H")).toBe(false);
    expect(isSpelledPitch({ step: "C", alter: 0, octave: 4 })).toBe(true);
    expect(isSpelledPitch({ step: "C", alter: 3, octave: 4 })).toBe(false);
    expect(isSpelledPitch({ step: "H", alter: 0, octave: 4 })).toBe(false);
    expect(isSpelledPitch({ step: "C", alter: 0, octave: 4.5 })).toBe(false);
    expect(isSpelledPitch(null)).toBe(false);
  });
});
