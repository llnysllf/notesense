import { describe, expect, it } from "vitest";
import {
  compareSongsByDifficulty,
  getSongDifficulty,
  getSongNoteRange,
  MAX_CHORD_SIZE,
  MAX_IMPORTED_SONGS,
  MAX_SONG_EVENTS,
  MAX_SONG_TITLE_LENGTH,
  deriveSongClef,
  isValidNoteId,
  noteIdToMidi,
  normalizeImportedSongs,
  normalizeSong,
  normalizeSongProgress,
} from "./songData";

function makeEvents(count: number, noteId = "C4") {
  return Array.from({ length: count }, () => ({ noteIds: [noteId], duration: "quarter" }));
}

describe("noteIdToMidi", () => {
  it("maps natural and sharp piano ids", () => {
    expect(noteIdToMidi("C4")).toBe(60);
    expect(noteIdToMidi("F#3")).toBe(54);
    expect(noteIdToMidi("A0")).toBe(21);
    expect(noteIdToMidi("C8")).toBe(108);
  });

  it("rejects out-of-range and malformed ids", () => {
    expect(noteIdToMidi("G#0")).toBeUndefined();
    expect(noteIdToMidi("C9")).toBeUndefined();
    expect(noteIdToMidi("H4")).toBeUndefined();
    expect(noteIdToMidi("Cb4")).toBeUndefined();
    expect(noteIdToMidi("")).toBeUndefined();
    expect(noteIdToMidi(42)).toBeUndefined();
  });

  it("backs the isValidNoteId guard", () => {
    expect(isValidNoteId("D5")).toBe(true);
    expect(isValidNoteId("X2")).toBe(false);
  });
});

describe("deriveSongClef", () => {
  it("picks treble at or above middle C and bass below", () => {
    expect(deriveSongClef(makeEvents(4, "E4") as never)).toBe("treble");
    expect(deriveSongClef(makeEvents(4, "G2") as never)).toBe("bass");
    expect(deriveSongClef([])).toBe("treble");
  });
});

describe("normalizeSong", () => {
  it("normalizes a valid song and sorts chord notes by pitch", () => {
    const song = normalizeSong(
      {
        title: "  Test Song  ",
        events: [{ noteIds: ["G4", "C4", "E4"], duration: "half" }, ...makeEvents(4)],
      },
      "builtin",
    );

    expect(song).toBeDefined();
    expect(song?.title).toBe("Test Song");
    expect(song?.source).toBe("builtin");
    expect(song?.clef).toBe("treble");
    expect(song?.events[0]?.noteIds).toEqual(["C4", "E4", "G4"]);
    expect(song?.id).toBe("builtin-test-song");
  });

  it("drops invalid notes, empty events, and oversized chords", () => {
    const song = normalizeSong(
      {
        title: "Filter",
        events: [
          { noteIds: ["C4", "banana"], duration: "quarter" },
          { noteIds: ["nope"], duration: "quarter" },
          { noteIds: ["C4", "D4", "E4", "F4", "G4"], duration: "quarter" },
          ...makeEvents(4),
        ],
      },
      "imported",
    );

    expect(song).toBeDefined();
    // invalid note filtered inside first event; all-invalid and >MAX_CHORD_SIZE events dropped
    expect(song?.events).toHaveLength(5);
    expect(song?.events[0]?.noteIds).toEqual(["C4"]);
    expect(song?.events.every((event) => event.noteIds.length <= MAX_CHORD_SIZE)).toBe(true);
  });

  it("defaults unknown durations to quarter", () => {
    const song = normalizeSong(
      { title: "Durations", events: makeEvents(4).map((event) => ({ ...event, duration: "wiggly" })) },
      "builtin",
    );
    expect(song?.events.every((event) => event.duration === "quarter")).toBe(true);
  });

  it("rejects songs without enough playable events or a title", () => {
    expect(normalizeSong({ title: "Too Short", events: makeEvents(3) }, "builtin")).toBeUndefined();
    expect(normalizeSong({ title: "   ", events: makeEvents(8) }, "builtin")).toBeUndefined();
    expect(normalizeSong(null, "builtin")).toBeUndefined();
    expect(normalizeSong("song", "builtin")).toBeUndefined();
  });

  it("caps events and title length", () => {
    const song = normalizeSong({ title: "x".repeat(200), events: makeEvents(MAX_SONG_EVENTS + 50) }, "imported");

    expect(song?.events).toHaveLength(MAX_SONG_EVENTS);
    expect(song?.title).toHaveLength(MAX_SONG_TITLE_LENGTH);
  });
});

describe("normalizeImportedSongs", () => {
  it("reads a valid song list and dedupes ids", () => {
    const songs = normalizeImportedSongs({
      songs: [
        { id: "custom-1", title: "One", events: makeEvents(4) },
        { id: "custom-1", title: "Duplicate", events: makeEvents(4) },
        { id: "custom-2", title: "Two", events: makeEvents(4) },
      ],
    });

    expect(songs.map((song) => song.id)).toEqual(["custom-1", "custom-2"]);
    expect(songs.every((song) => song.source === "imported")).toBe(true);
  });

  it("caps the imported library size", () => {
    const songs = normalizeImportedSongs({
      songs: Array.from({ length: MAX_IMPORTED_SONGS + 10 }, (_, index) => ({
        id: `custom-${index}`,
        title: `Song ${index}`,
        events: makeEvents(4),
      })),
    });

    expect(songs).toHaveLength(MAX_IMPORTED_SONGS);
  });

  it("returns empty for malformed containers", () => {
    expect(normalizeImportedSongs(null)).toEqual([]);
    expect(normalizeImportedSongs({ songs: "nope" })).toEqual([]);
    expect(normalizeImportedSongs([])).toEqual([]);
  });
});

describe("normalizeSongProgress", () => {
  it("keeps valid entries and clamps values", () => {
    const progress = normalizeSongProgress({
      "builtin-ode-to-joy": { bestAccuracy: 150, completions: -2, lastPlayedAt: "2026-07-11T00:00:00.000Z" },
    });

    expect(progress["builtin-ode-to-joy"]).toEqual({
      bestAccuracy: 100,
      completions: 0,
      lastPlayedAt: "2026-07-11T00:00:00.000Z",
    });
  });

  it("drops entries with invalid timestamps or shapes", () => {
    const progress = normalizeSongProgress({
      bad: { bestAccuracy: 90, completions: 1, lastPlayedAt: "not-a-date" },
      worse: "nope",
    });

    expect(progress).toEqual({});
    expect(normalizeSongProgress(null)).toEqual({});
  });
});

function makeSong(events: unknown[], title = "Made"): ReturnType<typeof normalizeSong> {
  return normalizeSong({ title, events }, "builtin");
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
