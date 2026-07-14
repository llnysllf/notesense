import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Song } from "@notesense/shared";
import { DEFAULT_TIME_SIGNATURE } from "@notesense/shared";
import { useSongSession } from "./useSongSession";

vi.mock("../audio", () => ({ playTone: vi.fn() }));

import { playTone } from "../audio";

const song: Song = {
  id: "builtin-hook-test",
  title: "Hook Test",
  source: "builtin",
  clef: "treble",
  timeSignature: DEFAULT_TIME_SIGNATURE,
  events: [
    { noteIds: ["C4"], duration: "quarter" },
    { noteIds: ["D4"], duration: "quarter" },
    { noteIds: ["E4"], duration: "quarter" },
    { noteIds: ["F4"], duration: "quarter" },
  ],
};

const songWithRest: Song = {
  id: "builtin-hook-rest-test",
  title: "Hook Rest Test",
  source: "builtin",
  clef: "treble",
  timeSignature: DEFAULT_TIME_SIGNATURE,
  events: [
    { noteIds: ["C4"], duration: "quarter" },
    { noteIds: [], duration: "quarter", isRest: true },
    { noteIds: ["D4"], duration: "quarter" },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useSongSession", () => {
  it("opens a song at the first event", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(song));

    expect(result.current.activeSong?.id).toBe("builtin-hook-test");
    expect(result.current.playthrough?.index).toBe(0);
    expect(result.current.status).toBe("idle");
  });

  it("advances on correct answers and plays the answered notes", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(song));
    act(() => result.current.answerCurrentEvent(["C4"]));

    expect(result.current.playthrough?.index).toBe(1);
    expect(playTone).toHaveBeenCalledTimes(1);
  });

  it("auto-advances past a rest after a short hold, without pressing a key", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(songWithRest));
    act(() => result.current.answerCurrentEvent(["C4"]));
    expect(result.current.playthrough?.index).toBe(1);

    act(() => vi.advanceTimersByTime(500));

    expect(result.current.playthrough?.index).toBe(2);
  });

  it("cancels the pending rest timer when the song is closed first", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(songWithRest));
    act(() => result.current.answerCurrentEvent(["C4"]));
    expect(result.current.playthrough?.index).toBe(1);

    act(() => result.current.closeSong());
    act(() => vi.advanceTimersByTime(500));

    expect(result.current.activeSong).toBeNull();
    expect(result.current.playthrough).toBeNull();
  });

  it("flags wrong answers and clears the flag after the feedback delay", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(song));
    act(() => result.current.answerCurrentEvent(["G4"]));

    expect(result.current.status).toBe("wrong");
    expect(result.current.playthrough?.index).toBe(0);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current.status).toBe("idle");
  });

  it("completes the song, records progress, and persists it", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(song));
    for (const event of song.events) {
      act(() => result.current.answerCurrentEvent(event.noteIds));
    }

    expect(result.current.status).toBe("complete");
    expect(result.current.summary?.completed).toBe(true);
    expect(result.current.summary?.accuracy).toBe(100);
    expect(result.current.songProgress["builtin-hook-test"]?.completions).toBe(1);

    const stored = JSON.parse(window.localStorage.getItem("notesense.songProgress.v1") ?? "{}");
    expect(stored["builtin-hook-test"]?.bestAccuracy).toBe(100);
    expect(result.current.storageWarning).toBe(false);
  });

  it("keeps best accuracy across repeat completions", () => {
    const { result } = renderHook(() => useSongSession());

    // First run: one mistake -> 80%.
    act(() => result.current.openSong(song));
    act(() => result.current.answerCurrentEvent(["B4"]));
    for (const event of song.events) {
      act(() => result.current.answerCurrentEvent(event.noteIds));
    }
    expect(result.current.songProgress["builtin-hook-test"]?.bestAccuracy).toBe(80);

    // Second run: perfect -> best rises to 100 and completions increment.
    act(() => result.current.restartSong());
    for (const event of song.events) {
      act(() => result.current.answerCurrentEvent(event.noteIds));
    }
    expect(result.current.songProgress["builtin-hook-test"]?.bestAccuracy).toBe(100);
    expect(result.current.songProgress["builtin-hook-test"]?.completions).toBe(2);
  });

  it("ignores answers after completion and resets via restart", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(song));
    for (const event of song.events) {
      act(() => result.current.answerCurrentEvent(event.noteIds));
    }

    act(() => result.current.answerCurrentEvent(["C4"]));
    expect(result.current.songProgress["builtin-hook-test"]?.completions).toBe(1);

    act(() => result.current.restartSong());
    expect(result.current.playthrough?.index).toBe(0);
    expect(result.current.status).toBe("idle");
  });

  it("closes the song and clears playthrough state", () => {
    const { result } = renderHook(() => useSongSession());

    act(() => result.current.openSong(song));
    act(() => result.current.closeSong());

    expect(result.current.activeSong).toBeNull();
    expect(result.current.playthrough).toBeNull();
  });

  it("surfaces a storage warning when persistence fails", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    const { result } = renderHook(() => useSongSession());
    act(() => result.current.openSong(song));
    for (const event of song.events) {
      act(() => result.current.answerCurrentEvent(event.noteIds));
    }

    expect(result.current.storageWarning).toBe(true);
    setItem.mockRestore();
  });
});
