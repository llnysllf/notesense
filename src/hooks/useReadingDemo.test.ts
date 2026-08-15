import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReadingDemo } from "./useReadingDemo";
import type { ReadingNoteName } from "../types";

function wrongName(correct: ReadingNoteName): ReadingNoteName {
  return correct === "C" ? "D" : "C";
}

describe("the home page demo", () => {
  it("starts with a real prompt and nothing answered", () => {
    const { result } = renderHook(() => useReadingDemo(true));

    expect(result.current?.note.id).toBeTruthy();
    expect(result.current?.verdict).toBe("unanswered");
    expect(result.current?.answered).toBe(0);
  });

  it("counts one answer per answer", () => {
    // It counted two. The updater that recorded the answer also incremented the
    // tally, and React may run an updater more than once.
    const { result } = renderHook(() => useReadingDemo(true));

    act(() => result.current?.answer(result.current.note.name));

    expect(result.current?.answered).toBe(1);
    expect(result.current?.correct).toBe(1);
    expect(result.current?.verdict).toBe("correct");
  });

  it("marks a wrong answer wrong without counting it correct", () => {
    const { result } = renderHook(() => useReadingDemo(true));

    act(() => result.current?.answer(wrongName(result.current.note.name)));

    expect(result.current?.verdict).toBe("wrong");
    expect(result.current?.answered).toBe(1);
    expect(result.current?.correct).toBe(0);
  });

  it("takes one answer per prompt rather than letting a visitor keep guessing", () => {
    const { result } = renderHook(() => useReadingDemo(true));
    const correct = result.current?.note.name as ReadingNoteName;

    act(() => result.current?.answer(wrongName(correct)));
    act(() => result.current?.answer(correct));

    expect(result.current?.verdict).toBe("wrong");
    expect(result.current?.answered).toBe(1);
  });

  it("clears the verdict for the next prompt but keeps the tally", () => {
    const { result } = renderHook(() => useReadingDemo(true));

    act(() => result.current?.answer(result.current.note.name));
    act(() => result.current?.next());

    expect(result.current?.verdict).toBe("unanswered");
    expect(result.current?.lastAnswer).toBeNull();
    expect(result.current?.answered).toBe(1);
  });

  it("moves to a different note rather than repeating the one just answered", () => {
    const { result } = renderHook(() => useReadingDemo(true));
    const first = result.current?.note.id;

    act(() => result.current?.next());

    expect(result.current?.note.id).not.toBe(first);
  });

  it("is absent on pages that do not carry it", () => {
    const { result } = renderHook(() => useReadingDemo(false));

    expect(result.current).toBeNull();
  });
});
