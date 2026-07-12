import { describe, expect, it } from "vitest";
import type { Song } from "@notesense/shared";
import {
  applyAnswer,
  checkAnswer,
  describeSongEvent,
  getCurrentEvent,
  getPlaythroughSummary,
  startPlaythrough,
} from "./songEngine";
import { getSongDifficulty } from "./songEngine";
import { BUILT_IN_SONGS, buildBuiltInSongs, getSongById } from "./songLibraryData";

const song: Song = {
  id: "builtin-test",
  title: "Test",
  source: "builtin",
  clef: "treble",
  events: [
    { noteIds: ["C4"], duration: "quarter" },
    { noteIds: ["C4", "E4", "G4"], duration: "half" },
    { noteIds: ["D4"], duration: "quarter" },
    { noteIds: ["E4"], duration: "whole" },
  ],
};

describe("startPlaythrough", () => {
  it("starts at the first event with clean counters", () => {
    const playthrough = startPlaythrough(song, new Date("2026-07-11T00:00:00Z"));

    expect(playthrough).toMatchObject({ songId: "builtin-test", index: 0, attempts: 0, correctEvents: 0 });
    expect(playthrough.startedAt).toBe("2026-07-11T00:00:00.000Z");
    expect(getCurrentEvent(song, playthrough)?.noteIds).toEqual(["C4"]);
  });
});

describe("checkAnswer", () => {
  it("requires exact set equality regardless of order", () => {
    const chord = song.events[1]!;

    expect(checkAnswer(chord, ["G4", "C4", "E4"])).toBe(true);
    expect(checkAnswer(chord, ["C4", "E4"])).toBe(false);
    expect(checkAnswer(chord, ["C4", "E4", "G4", "B4"])).toBe(false);
    expect(checkAnswer(chord, ["C4", "E4", "A4"])).toBe(false);
    expect(checkAnswer(song.events[0]!, ["C4"])).toBe(true);
    expect(checkAnswer(song.events[0]!, ["C5"])).toBe(false);
  });
});

describe("applyAnswer", () => {
  it("advances on a correct answer and records mistakes without advancing", () => {
    let playthrough = startPlaythrough(song);

    const wrong = applyAnswer(playthrough, song, ["D4"]);
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.next.index).toBe(0);
    expect(wrong.next.attempts).toBe(1);
    expect(wrong.next.mistakesByEvent[0]).toBe(1);

    const right = applyAnswer(wrong.next, song, ["C4"]);
    expect(right.isCorrect).toBe(true);
    expect(right.next.index).toBe(1);
    expect(right.next.correctEvents).toBe(1);
    expect(right.isComplete).toBe(false);

    playthrough = right.next;
    playthrough = applyAnswer(playthrough, song, ["C4", "E4", "G4"]).next;
    playthrough = applyAnswer(playthrough, song, ["D4"]).next;

    const finish = applyAnswer(playthrough, song, ["E4"], new Date("2026-07-11T00:01:00Z"));
    expect(finish.isComplete).toBe(true);
    expect(finish.next.finishedAt).toBe("2026-07-11T00:01:00.000Z");
  });

  it("ignores answers after completion", () => {
    let playthrough = startPlaythrough(song);
    for (const event of song.events) {
      playthrough = applyAnswer(playthrough, song, event.noteIds).next;
    }

    const after = applyAnswer(playthrough, song, ["C4"]);
    expect(after.next).toBe(playthrough);
    expect(after.isComplete).toBe(true);
  });
});

describe("getPlaythroughSummary", () => {
  it("summarizes accuracy, completion, and duration", () => {
    let playthrough = startPlaythrough(song, new Date("2026-07-11T00:00:00Z"));
    playthrough = applyAnswer(playthrough, song, ["B4"]).next; // mistake
    for (const event of song.events) {
      playthrough = applyAnswer(playthrough, song, event.noteIds, new Date("2026-07-11T00:00:30Z")).next;
    }

    const summary = getPlaythroughSummary(playthrough, song);
    expect(summary).toMatchObject({
      attempts: 5,
      correctEvents: 4,
      totalEvents: 4,
      completed: true,
      durationSeconds: 30,
    });
    expect(summary.accuracy).toBe(80);
  });

  it("reports zero accuracy before any attempt", () => {
    expect(getPlaythroughSummary(startPlaythrough(song), song).accuracy).toBe(0);
  });
});

describe("describeSongEvent", () => {
  it("labels single notes and chords", () => {
    expect(describeSongEvent(song.events[0]!)).toBe("C4, quarter note");
    expect(describeSongEvent(song.events[1]!)).toBe("C4, E4 and G4, half note");
  });
});

describe("BUILT_IN_SONGS", () => {
  it("provides at least ten validated public-domain songs", () => {
    expect(BUILT_IN_SONGS.length).toBeGreaterThanOrEqual(18);
    for (const builtIn of BUILT_IN_SONGS) {
      expect(builtIn.source).toBe("builtin");
      expect(builtIn.events.length).toBeGreaterThanOrEqual(4);
      expect(builtIn.id.startsWith("builtin-")).toBe(true);
    }
  });

  it("includes an accidental melody for sheet rendering coverage", () => {
    const furElise = BUILT_IN_SONGS.find((builtIn) => builtIn.id === "builtin-fur-elise");
    expect(furElise?.events.some((event) => event.noteIds.some((noteId) => noteId.includes("#")))).toBe(true);
  });

  it("finds songs by id", () => {
    expect(getSongById(BUILT_IN_SONGS, "builtin-ode-to-joy")?.title).toBe("Ode to Joy (Beethoven)");
    expect(getSongById(BUILT_IN_SONGS, "missing")).toBeUndefined();
  });

  it("throws when a built-in song fails validation", () => {
    expect(() => buildBuiltInSongs([{ id: "builtin-bad", title: " ", events: [] }])).toThrow(
      "Built-in song failed validation: builtin-bad",
    );
  });

  it("covers all three difficulty levels", () => {
    const difficulties = new Set(BUILT_IN_SONGS.map((builtIn) => getSongDifficulty(builtIn)));
    expect(difficulties).toEqual(new Set(["beginner", "intermediate", "advanced"]));
  });

  it("keeps all built-ins single-note in the foundation release", () => {
    for (const builtIn of BUILT_IN_SONGS) {
      expect(builtIn.events.every((event) => event.noteIds.length === 1)).toBe(true);
    }
  });
});
