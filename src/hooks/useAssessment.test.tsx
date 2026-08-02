import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAssessment } from "./useAssessment";
import { midiToNoteId } from "../types";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAssessment", () => {
  it("wires both assessment screens from one hook", () => {
    const { result } = renderHook(() => useAssessment({ inputSource: "touch" }));

    expect(result.current.placement.state.answered).toBe(0);
    expect(result.current.readingScore.status).toBe("idle");
    expect(result.current.readingScore.passage.notes.length).toBeGreaterThan(0);
  });

  it("opens the assessment in the easy band when nothing has been placed", () => {
    const { result } = renderHook(() => useAssessment({ inputSource: "touch" }));

    expect(result.current.readingScore.passage.band).toBe("easy");
  });

  it("opens the assessment at the placement the learner accepted", () => {
    window.localStorage.setItem(
      "notesense.placement.v1",
      JSON.stringify({
        version: 1,
        difficulty: 0.9,
        band: "hard",
        confidence: 0.5,
        itemsAnswered: 6,
        stopReason: "confident",
        explanation: "",
        isProvisional: true,
      }),
    );

    const { result } = renderHook(() => useAssessment({ inputSource: "touch" }));

    expect(result.current.readingScore.passage.band).toBe("hard");
  });

  it("records a completed sitting against the declared input source", () => {
    const { result } = renderHook(() => useAssessment({ inputSource: "midi" }));

    act(() => result.current.readingScore.start());
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    const expected = result.current.readingScore.passage.notes.map((note) => midiToNoteId(note.midi));
    act(() => {
      for (const noteId of expected) result.current.readingScore.play(noteId);
    });

    expect(result.current.readingScore.status).toBe("complete");
    expect(result.current.readingScore.isTrendworthy).toBe(true);
    expect(result.current.readingScore.latest?.inputSource).toBe("midi");
  });
});
