import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTranscriber } from "./useTranscriber";

const SLOTS = [0, 960, 1920, 2880];
const options = { slots: SLOTS, lowMidi: 55, highMidi: 79 };

describe("useTranscriber", () => {
  it("starts empty with nothing to undo", () => {
    const { result } = renderHook(() => useTranscriber(options));

    expect(result.current.notes).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("writes a note into a slot without selecting it", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(960, 62));

    expect(result.current.notes).toEqual([{ midi: 62, onsetTicks: 960 }]);
    // Writing a note does not select it: selection steers where the *next* note
    // goes, so auto-selecting would make playing a phrase through overwrite the
    // same position every time.
    expect(result.current.selected).toBeNull();
  });

  it("fills forward when notes are played one after another", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.place(960, 64));

    expect(result.current.notes).toEqual([
      { midi: 60, onsetTicks: 0 },
      { midi: 64, onsetTicks: 960 },
    ]);
  });

  it("keeps notes in time order however they were entered", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(2880, 67));
    act(() => result.current.place(0, 60));
    act(() => result.current.place(960, 62));

    expect(result.current.notes.map((note) => note.onsetTicks)).toEqual([0, 960, 2880]);
  });

  it("replaces whatever was already in a slot", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.place(0, 64));

    expect(result.current.notes).toEqual([{ midi: 64, onsetTicks: 0 }]);
  });

  it("refuses a slot that is not on the grid, and a pitch out of range", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(123, 60));
    act(() => result.current.place(0, 20));

    expect(result.current.notes).toEqual([]);
  });

  it("deletes a note", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.removeAt(0));

    expect(result.current.notes).toEqual([]);
    expect(result.current.selected).toBeNull();
  });

  it("ignores a delete that points at nothing", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.removeAt(4));

    expect(result.current.canUndo).toBe(false);
  });

  it("moves the selected note by semitone, within range", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.select(0));
    act(() => result.current.nudgePitch(2));
    expect(result.current.notes[0]?.midi).toBe(62);

    // Clamped, not wrapped: the range is the range.
    act(() => result.current.nudgePitch(100));
    expect(result.current.notes[0]?.midi).toBe(79);
    act(() => result.current.nudgePitch(1));
    expect(result.current.notes[0]?.midi).toBe(79);
  });

  it("moves the selected note along the grid", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.select(0));
    act(() => result.current.nudgeOnset(2));

    expect(result.current.notes[0]?.onsetTicks).toBe(1920);
  });

  it("will not move a note onto one that is already there", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.place(960, 62));
    act(() => result.current.select(0));
    act(() => result.current.nudgeOnset(1));

    // Silently overwriting the learner's other note would be worse than
    // refusing the move.
    expect(result.current.notes).toEqual([
      { midi: 60, onsetTicks: 0 },
      { midi: 62, onsetTicks: 960 },
    ]);
  });

  it("will not move a note off the end of the grid", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(2880, 60));
    act(() => result.current.select(0));
    act(() => result.current.nudgeOnset(1));

    expect(result.current.notes[0]?.onsetTicks).toBe(2880);
  });

  it("does nothing when nudging with nothing selected", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.nudgePitch(1));

    expect(result.current.notes[0]?.midi).toBe(60);
  });

  it("undoes and redoes every kind of edit", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.place(960, 62));
    expect(result.current.notes).toHaveLength(2);

    act(() => result.current.undo());
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.notes).toHaveLength(2);
  });

  it("drops the redo branch once a new edit is made", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.undo());
    act(() => result.current.place(960, 64));

    // The thing they just did is now the present.
    expect(result.current.canRedo).toBe(false);
    expect(result.current.notes).toEqual([{ midi: 64, onsetTicks: 960 }]);
  });

  it("has nothing to undo or redo at the ends of its history", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.notes).toEqual([]);
  });

  it("clears everything, and the clear itself can be undone", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.place(0, 60));
    act(() => result.current.place(960, 62));
    act(() => result.current.clear());
    expect(result.current.notes).toEqual([]);

    act(() => result.current.undo());
    expect(result.current.notes).toHaveLength(2);
  });

  it("ignores a clear when there is nothing written", () => {
    const { result } = renderHook(() => useTranscriber(options));

    act(() => result.current.clear());

    expect(result.current.canUndo).toBe(false);
  });
});
