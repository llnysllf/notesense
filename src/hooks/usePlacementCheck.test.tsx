import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePlacementCheck } from "./usePlacementCheck";

beforeEach(() => {
  window.localStorage.clear();
});

describe("usePlacementCheck", () => {
  it("asks about a real note from the start", () => {
    const { result } = renderHook(() => usePlacementCheck());

    expect(result.current.promptNoteId).toMatch(/^[A-G][#b]?\d$/);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.outcome).toBeUndefined();
  });

  it("moves on when the right key is played", () => {
    const { result } = renderHook(() => usePlacementCheck());
    const first = result.current.promptNoteId;

    act(() => result.current.answer(first));

    expect(result.current.state.answered).toBe(1);
    expect(result.current.state.history[0]?.correct).toBe(true);
  });

  it("records a wrong key as wrong", () => {
    const { result } = renderHook(() => usePlacementCheck());
    const wrong = result.current.promptNoteId === "C4" ? "D4" : "C4";

    act(() => result.current.answer(wrong));

    expect(result.current.state.history[0]?.correct).toBe(false);
  });

  it("finishes and offers a starting point", () => {
    const { result } = renderHook(() => usePlacementCheck());

    // Enough answers that the staircase must stop one way or another.
    act(() => {
      for (let index = 0; index < 14; index += 1) {
        result.current.answer(index % 2 === 0 ? result.current.promptNoteId : "A0");
      }
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.startingPoint?.summary).toMatch(/Starting at/);
  });

  it("saves nothing until the learner accepts it", () => {
    const { result } = renderHook(() => usePlacementCheck());

    act(() => {
      for (let index = 0; index < 14; index += 1) result.current.answer(result.current.promptNoteId);
    });
    expect(window.localStorage.getItem("notesense.placement.v1")).toBeNull();

    act(() => result.current.accept());
    expect(window.localStorage.getItem("notesense.placement.v1")).not.toBeNull();
    expect(result.current.saved?.isProvisional).toBe(true);
  });

  it("reads back a placement saved earlier", () => {
    const { result: first } = renderHook(() => usePlacementCheck());
    act(() => {
      for (let index = 0; index < 14; index += 1) first.current.answer(first.current.promptNoteId);
    });
    act(() => first.current.accept());

    const { result: second } = renderHook(() => usePlacementCheck());
    expect(second.current.saved?.band).toBe(first.current.outcome?.band);
  });

  it("ignores a stored placement that does not make sense", () => {
    window.localStorage.setItem("notesense.placement.v1", JSON.stringify({ difficulty: "high" }));

    const { result } = renderHook(() => usePlacementCheck());

    expect(result.current.saved).toBeUndefined();
  });

  it("starts over on request", () => {
    const { result } = renderHook(() => usePlacementCheck());

    act(() => result.current.answer(result.current.promptNoteId));
    act(() => result.current.restart());

    expect(result.current.state.answered).toBe(0);
  });

  it("does nothing when asked to accept a check that has not finished", () => {
    const { result } = renderHook(() => usePlacementCheck());

    act(() => result.current.accept());

    expect(result.current.saved).toBeUndefined();
  });
});
