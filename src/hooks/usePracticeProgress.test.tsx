import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProgress } from "../noteData";
import type { PracticeProgress } from "../types";
import { usePracticeProgress } from "./usePracticeProgress";

const PROGRESS_STORAGE_KEY = "notesense.progress.v2";

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("usePracticeProgress", () => {
  it("loads progress from normalized local storage", () => {
    const storedProgress = freshProgress();
    storedProgress.reading.totalAttempts = 4;
    storedProgress.reading.totalCorrect = 3;
    storedProgress.reading.noteStats.C4 = { attempts: 4, correct: 3 };
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(storedProgress));

    const { result } = renderHook(() => usePracticeProgress());

    expect(result.current.progress.reading.totalAttempts).toBe(4);
    expect(result.current.progress.reading.totalCorrect).toBe(3);
    expect(result.current.progress.reading.noteStats.C4).toEqual({ attempts: 4, correct: 3 });
  });

  it("updates in-memory progress separately from persistence", () => {
    const { result } = renderHook(() => usePracticeProgress());
    const nextProgress = freshProgress();
    nextProgress.pitch.totalAttempts = 2;

    act(() => result.current.setProgress(nextProgress));

    expect(result.current.progress).toEqual(nextProgress);
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("persists progress and reports storage failures", () => {
    const { result } = renderHook(() => usePracticeProgress());
    const nextProgress = freshProgress();
    nextProgress.reading.bestRoundScore = 5;

    expect(result.current.persistProgress(nextProgress)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}")).toEqual(nextProgress);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    expect(result.current.persistProgress(nextProgress)).toBe(false);
  });
});
