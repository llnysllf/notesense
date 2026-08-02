import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingScoreHistory } from "./useReadingScoreHistory";
import { buildAssessmentPassage, type ReadingScoreResult } from "../types";

const passage = buildAssessmentPassage({ difficulty: 0.6, seed: "history-fixture" });

function resultWith(overrides: Partial<ReadingScoreResult> = {}): ReadingScoreResult {
  return {
    algorithmVersion: 1,
    score: 70,
    components: { noteAccuracy: 0.9, rhythmAccuracy: 0.7, continuity: 0.8, fluency: 0.6 },
    difficulty: passage.difficulty,
    notesExpected: 15,
    notesPlayed: 15,
    confidence: 1,
    isProvisional: true,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("useReadingScoreHistory", () => {
  it("starts empty and calls the first sitting a baseline", () => {
    const { result } = renderHook(() => useReadingScoreHistory());

    expect(result.current.history).toEqual([]);
    expect(result.current.trend.kind).toBe("first");
  });

  it("records a sitting and reports it as the latest", () => {
    const { result } = renderHook(() => useReadingScoreHistory());

    act(() => result.current.record(resultWith(), passage, "touch"));

    expect(result.current.history).toHaveLength(1);
    expect(result.current.latest?.score).toBe(70);
    expect(result.current.latest?.inputSource).toBe("touch");
  });

  it("compares a second comparable sitting against the first", () => {
    const { result } = renderHook(() => useReadingScoreHistory());

    act(() => result.current.record(resultWith({ score: 60 }), passage, "touch"));
    act(() => result.current.record(resultWith({ score: 74 }), passage, "touch"));

    expect(result.current.trend).toMatchObject({ kind: "comparable", deltaPoints: 14 });
  });

  it("refuses to record a run too thin to mean anything", () => {
    const { result } = renderHook(() => useReadingScoreHistory());

    act(() => result.current.record(resultWith({ confidence: 0.2, notesPlayed: 3 }), passage, "touch"));

    expect(result.current.history).toEqual([]);
  });

  it("persists across a reload", () => {
    const { result: first } = renderHook(() => useReadingScoreHistory());
    act(() => first.current.record(resultWith({ score: 81 }), passage, "midi"));

    const { result: second } = renderHook(() => useReadingScoreHistory());
    expect(second.current.latest?.score).toBe(81);
  });

  it("ignores stored history that has been tampered with", () => {
    window.localStorage.setItem("notesense.readingScores.v1", "{ not json");

    const { result } = renderHook(() => useReadingScoreHistory());

    expect(result.current.history).toEqual([]);
  });

  it("says so when the result cannot be written to this device", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const { result } = renderHook(() => useReadingScoreHistory());
    act(() => result.current.record(resultWith(), passage, "touch"));

    // The result is still shown; the learner is simply told it did not persist.
    expect(result.current.history).toHaveLength(1);
    expect(result.current.storageWarning).toBe(true);
    setItem.mockRestore();
  });
});
