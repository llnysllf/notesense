import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingScoreRun } from "./useReadingScoreRun";
import { midiToNoteId } from "../types";

// jsdom has no AudioContext, so the run falls back to the silent clock. That is
// the path a learner with audio blocked takes, and it is worth exercising.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function startedRun(difficulty = 0.35) {
  const view = renderHook(() => useReadingScoreRun({ difficulty }));
  act(() => view.result.current.start());
  // Run out the count-in.
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  return view;
}

describe("useReadingScoreRun", () => {
  it("builds an unseen passage before anything is played", () => {
    const { result } = renderHook(() => useReadingScoreRun({ difficulty: 0.35 }));

    expect(result.current.status).toBe("idle");
    expect(result.current.passage.notes.length).toBeGreaterThan(0);
    expect(result.current.result).toBeNull();
  });

  it("counts in before accepting anything", () => {
    const { result } = renderHook(() => useReadingScoreRun({ difficulty: 0.35 }));

    act(() => result.current.start());
    expect(result.current.status).toBe("count-in");

    // A note played during the count-in is not part of the performance.
    act(() => result.current.play("C4"));
    expect(result.current.answeredCount).toBe(0);
  });

  it("accepts notes once the passage begins", () => {
    const { result } = startedRun();

    expect(result.current.status).toBe("running");
    act(() => result.current.play("C4"));
    expect(result.current.answeredCount).toBe(1);
  });

  it("scores the whole passage when the learner plays it all", () => {
    const { result } = startedRun();
    const expected = result.current.passage.notes.map((note) => midiToNoteId(note.midi));

    act(() => {
      for (const noteId of expected) result.current.play(noteId);
    });

    expect(result.current.status).toBe("complete");
    expect(result.current.result?.components.noteAccuracy).toBe(1);
    expect(result.current.result?.notesPlayed).toBe(expected.length);
  });

  it("counts notes never reached against the run rather than shortening the passage", () => {
    const { result } = startedRun();
    const expected = result.current.passage.notes.map((note) => midiToNoteId(note.midi));

    act(() => {
      for (const noteId of expected.slice(0, 3)) result.current.play(noteId);
    });
    act(() => result.current.finish());

    expect(result.current.result?.notesExpected).toBe(expected.length);
    expect(result.current.result?.notesPlayed).toBe(3);
    // Three right notes out of fifteen is not a perfect score.
    expect(result.current.result?.components.noteAccuracy).toBeLessThan(1);
  });

  it("gives no feedback while running — the result only appears at the end", () => {
    const { result } = startedRun();

    act(() => result.current.play("C4"));
    expect(result.current.result).toBeNull();
  });

  it("ends on its own if the learner simply stops", () => {
    const { result } = startedRun();

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(result.current.status).toBe("complete");
    expect(result.current.result?.score).toBe(0);
  });

  it("hands out a different form when asked for another", () => {
    const { result } = renderHook(() => useReadingScoreRun({ difficulty: 0.35 }));
    const first = result.current.passage.formId;

    act(() => {
      vi.advanceTimersByTime(5);
      result.current.nextForm();
    });

    expect(result.current.passage.formId).not.toBe(first);
    expect(result.current.status).toBe("idle");
  });

  it("reports that the count-in is silent when audio is unavailable", () => {
    const { result } = startedRun();

    expect(result.current.isAudible).toBe(false);
  });

  it("ignores anything played after the last note of the passage", () => {
    const { result } = startedRun();
    const expected = result.current.passage.notes.map((note) => midiToNoteId(note.midi));

    act(() => {
      for (const noteId of expected) result.current.play(noteId);
    });
    act(() => result.current.play("C4"));

    expect(result.current.answeredCount).toBe(expected.length);
  });

  it("does nothing when finishing a run that never started", () => {
    const { result } = renderHook(() => useReadingScoreRun({ difficulty: 0.35 }));

    act(() => result.current.finish());

    expect(result.current.status).toBe("idle");
  });

  it("treats an unknown key as a played wrong note rather than dropping it", () => {
    const { result } = startedRun();

    act(() => result.current.play("not-a-key"));

    expect(result.current.answeredCount).toBe(1);
    act(() => result.current.finish());
    expect(result.current.result?.notesPlayed).toBe(1);
  });

  it("tells the caller when a run completes", () => {
    const onComplete = vi.fn();
    const view = renderHook(() => useReadingScoreRun({ difficulty: 0.35, onComplete }));
    act(() => view.result.current.start());
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const expected = view.result.current.passage.notes.map((note) => midiToNoteId(note.midi));
    act(() => {
      for (const noteId of expected) view.result.current.play(noteId);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]?.[1]).toMatchObject({ formId: view.result.current.passage.formId });
  });

  it("rebuilds the form when the difficulty band changes", () => {
    const { result, rerender } = renderHook(({ difficulty }) => useReadingScoreRun({ difficulty }), {
      initialProps: { difficulty: 0.1 },
    });
    const intro = result.current.passage.band;

    rerender({ difficulty: 0.9 });

    expect(intro).toBe("intro");
    expect(result.current.passage.band).toBe("hard");
  });
});
