import { describe, expect, it } from "vitest";
import {
  BASS_STARTER_NOTES,
  BASS_ONE_OCTAVE_NOTES,
  CUSTOM_READING_KEY_IDS,
  CUSTOM_READING_MAX_NOTE_ID,
  CUSTOM_READING_MIN_NOTE_ID,
  CUSTOM_READING_NOTES,
  DEFAULT_CUSTOM_READING_RANGE,
  DEFAULT_READING_RANGE,
  GRAND_STARTER_NOTES,
  PITCH_ANSWER_OPTIONS,
  PITCH_NOTES,
  PIANO_KEYS,
  PIANO_WHITE_KEY_COUNT,
  READING_ANSWER_OPTIONS,
  READING_NOTES,
  READING_RANGES,
  STARTER_NOTES,
  TREBLE_ONE_OCTAVE_NOTES,
  emptyPitchProgress,
  emptyProgress,
  emptyReadingProgress,
  getCustomReadingNotes,
  getReadingNotes,
  getReadingRange,
  getPianoKeyById,
  isReadingRange,
  normalizeCustomReadingRange,
} from "./noteData";

function noteIds(notes: Array<{ id: string }>): string[] {
  return notes.map((note) => note.id);
}

describe("noteData", () => {
  it("exposes the supported reading ranges and default starter range", () => {
    expect(DEFAULT_READING_RANGE).toBe("treble-starter");
    expect(READING_RANGES.map((range) => range.id)).toEqual([
      "treble-starter",
      "bass-starter",
      "treble-one-octave",
      "bass-one-octave",
      "grand-starter",
      "custom",
    ]);
    expect(getReadingRange("treble-starter")).toMatchObject({
      label: "Treble",
      clef: "treble",
      detail: "Treble clef C4-G4",
      notes: STARTER_NOTES,
    });
    expect(getReadingRange("bass-starter")).toMatchObject({
      label: "Bass",
      clef: "bass",
      detail: "Bass clef C3-G3",
      notes: BASS_STARTER_NOTES,
    });
    expect(getReadingRange("treble-one-octave")).toMatchObject({
      label: "Treble octave",
      detail: "Treble clef C4-B4",
      notes: TREBLE_ONE_OCTAVE_NOTES,
    });
    expect(getReadingRange("bass-one-octave")).toMatchObject({
      label: "Bass octave",
      detail: "Bass clef C3-B3",
      notes: BASS_ONE_OCTAVE_NOTES,
    });
    expect(getReadingRange("grand-starter")).toMatchObject({
      label: "Grand",
      detail: "Mixed clef C3-B4",
      notes: GRAND_STARTER_NOTES,
    });
    expect(getReadingRange("custom", { startNoteId: "D3", endNoteId: "F4" })).toMatchObject({
      label: "Custom",
      detail: "Custom D3-F4",
      notes: getCustomReadingNotes({ startNoteId: "D3", endNoteId: "F4" }),
    });
  });

  it("returns treble notes by default and falls back to the default range for unsafe values", () => {
    expect(getReadingNotes()).toBe(STARTER_NOTES);
    expect(getReadingNotes("bass-starter")).toBe(BASS_STARTER_NOTES);
    expect(getReadingNotes("grand-starter")).toBe(GRAND_STARTER_NOTES);
    expect(noteIds(getReadingNotes("custom", { startNoteId: "A3", endNoteId: "C4" }))).toEqual(["A3", "B3", "C4"]);
    expect(getReadingRange("wide-range" as never)).toBe(getReadingRange(DEFAULT_READING_RANGE));
  });

  it("normalizes custom reading ranges to supported natural piano keys", () => {
    expect(DEFAULT_CUSTOM_READING_RANGE).toEqual({ startNoteId: "C3", endNoteId: "B4" });
    expect(CUSTOM_READING_MIN_NOTE_ID).toBe("C2");
    expect(CUSTOM_READING_MAX_NOTE_ID).toBe("B5");
    expect(noteIds(CUSTOM_READING_NOTES).slice(0, 3)).toEqual(["C2", "D2", "E2"]);
    expect(noteIds(CUSTOM_READING_NOTES).slice(-3)).toEqual(["G5", "A5", "B5"]);
    expect(CUSTOM_READING_KEY_IDS).toEqual(noteIds(CUSTOM_READING_NOTES));
    expect(normalizeCustomReadingRange({ startNoteId: "B4", endNoteId: "C3" })).toEqual({
      startNoteId: "C3",
      endNoteId: "B4",
    });
    expect(normalizeCustomReadingRange({ startNoteId: "A0", endNoteId: "C8" })).toEqual(DEFAULT_CUSTOM_READING_RANGE);
  });

  it("validates reading range ids defensively", () => {
    expect(isReadingRange("treble-starter")).toBe(true);
    expect(isReadingRange("bass-starter")).toBe(true);
    expect(isReadingRange("treble-one-octave")).toBe(true);
    expect(isReadingRange("bass-one-octave")).toBe(true);
    expect(isReadingRange("grand-starter")).toBe(true);
    expect(isReadingRange("custom")).toBe(true);
    expect(isReadingRange("wide-range")).toBe(false);
    expect(isReadingRange(undefined)).toBe(false);
  });

  it("keeps note ids, answer options, and shortcuts stable", () => {
    expect(noteIds(STARTER_NOTES)).toEqual(["C4", "D4", "E4", "F4", "G4"]);
    expect(noteIds(BASS_STARTER_NOTES)).toEqual(["C3", "D3", "E3", "F3", "G3"]);
    expect(noteIds(TREBLE_ONE_OCTAVE_NOTES)).toEqual(["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
    expect(noteIds(BASS_ONE_OCTAVE_NOTES)).toEqual(["C3", "D3", "E3", "F3", "G3", "A3", "B3"]);
    expect(noteIds(GRAND_STARTER_NOTES)).toEqual([
      "C3",
      "D3",
      "E3",
      "F3",
      "G3",
      "A3",
      "B3",
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
    expect(noteIds(PITCH_NOTES)).toEqual(["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
    expect(READING_ANSWER_OPTIONS).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(PITCH_ANSWER_OPTIONS).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(STARTER_NOTES.map((note) => note.keyboardShortcut)).toEqual(["1", "2", "3", "4", "5"]);
    expect(TREBLE_ONE_OCTAVE_NOTES.map((note) => note.keyboardShortcut)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(PITCH_NOTES.map((note) => note.keyboardShortcut)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("models the full 88-key piano range from A0 to C8", () => {
    expect(PIANO_KEYS).toHaveLength(88);
    expect(PIANO_WHITE_KEY_COUNT).toBe(52);
    expect(PIANO_KEYS.filter((key) => key.isBlack)).toHaveLength(36);
    expect(PIANO_KEYS[0]).toMatchObject({ id: "A0", name: "A", octave: 0, isBlack: false });
    expect(PIANO_KEYS.at(-1)).toMatchObject({ id: "C8", name: "C", octave: 8, isBlack: false });
    expect(getPianoKeyById("C4")).toMatchObject({ id: "C4", naturalName: "C", whiteKeyIndex: 23 });
    expect(getPianoKeyById("C#4")).toMatchObject({ id: "C#4", naturalName: "C", blackKeyAfterWhiteIndex: 23 });
    expect(getPianoKeyById("H4")).toBeUndefined();
  });

  it("seeds empty progress for every known reading note and pitch", () => {
    expect(Object.keys(emptyReadingProgress.noteStats)).toEqual(noteIds(READING_NOTES));
    expect(Object.keys(emptyPitchProgress.noteStats)).toEqual(noteIds(PITCH_NOTES));
    expect(Object.values(emptyReadingProgress.noteStats)).toEqual(
      Array.from({ length: READING_NOTES.length }, () => ({ attempts: 0, correct: 0 })),
    );
    expect(Object.values(emptyPitchProgress.noteStats)).toEqual(
      Array.from({ length: PITCH_NOTES.length }, () => ({ attempts: 0, correct: 0 })),
    );
    expect(emptyProgress).toMatchObject({
      reading: emptyReadingProgress,
      pitch: emptyPitchProgress,
      history: [],
    });
  });
});
