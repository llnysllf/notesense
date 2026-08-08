import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EarTranscriber from "./EarTranscriber";
import type { NotatedNote, TranscriberView } from "../../types";

const SLOTS = [0, 960, 1920];

function renderEditor(notes: NotatedNote[] = [], overrides: Partial<TranscriberView> = {}) {
  const transcriber: TranscriberView = {
    notes,
    selected: null,
    canUndo: false,
    canRedo: false,
    select: vi.fn(),
    place: vi.fn(),
    removeAt: vi.fn(),
    nudgePitch: vi.fn(),
    nudgeOnset: vi.fn(),
    clear: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    ...overrides,
  };
  const props = { transcriber, onPlayAnswer: vi.fn(), onSubmit: vi.fn() };
  const view = render(
    <EarTranscriber
      transcriber={transcriber}
      slots={SLOTS}
      isAnswered={false}
      comparison={undefined}
      onPlayAnswer={props.onPlayAnswer}
      onSubmit={props.onSubmit}
    />,
  );
  return { ...props, container: view.container };
}

describe("EarTranscriber", () => {
  it("shows a position for every note in the phrase", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Position 1, empty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Position 3, empty" })).toBeInTheDocument();
  });

  it("reads the written phrase back for a screen reader", () => {
    renderEditor([
      { midi: 60, onsetTicks: 0 },
      { midi: 64, onsetTicks: 960 },
    ]);

    expect(screen.getByRole("img", { name: "Your transcription: C4, E4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Position 2, E4" })).toBeInTheDocument();
  });

  it("writes a played note into the first free position", () => {
    const place = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { place });

    fireEvent.click(screen.getByRole("button", { name: "White piano key E4" }));

    // Position 1 is taken, so the note goes to position 2 without the learner
    // having to aim.
    expect(place).toHaveBeenCalledWith(960, 64);
  });

  it("writes into the selected position when there is one", () => {
    const place = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 1920 }], { place, selected: 0 });

    fireEvent.click(screen.getByRole("button", { name: "White piano key G4" }));

    expect(place).toHaveBeenCalledWith(1920, 67);
  });

  it("moves the selected note with the arrow keys", () => {
    const nudgePitch = vi.fn();
    const nudgeOnset = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { selected: 0, nudgePitch, nudgeOnset });

    const position = screen.getByRole("button", { name: "Position 1, C4" });
    fireEvent.keyDown(position, { key: "ArrowUp" });
    fireEvent.keyDown(position, { key: "ArrowDown" });
    fireEvent.keyDown(position, { key: "ArrowRight" });
    fireEvent.keyDown(position, { key: "ArrowLeft" });

    expect(nudgePitch).toHaveBeenCalledWith(1);
    expect(nudgePitch).toHaveBeenCalledWith(-1);
    expect(nudgeOnset).toHaveBeenCalledWith(1);
    expect(nudgeOnset).toHaveBeenCalledWith(-1);
  });

  it("deletes the selected note from the keyboard", () => {
    const removeAt = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { selected: 0, removeAt });

    fireEvent.keyDown(screen.getByRole("button", { name: "Position 1, C4" }), { key: "Delete" });

    expect(removeAt).toHaveBeenCalledWith(0);
  });

  it("ignores keys it does not handle", () => {
    const nudgePitch = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { selected: 0, nudgePitch });

    fireEvent.keyDown(screen.getByRole("button", { name: "Position 1, C4" }), { key: "a" });

    expect(nudgePitch).not.toHaveBeenCalled();
  });

  it("offers undo and redo only when there is something to undo or redo", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("undoes and redoes on request", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderEditor([], { canUndo: true, canRedo: true, undo, redo });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));

    expect(undo).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();
  });

  it("explains how to edit without a mouse", () => {
    renderEditor();

    expect(screen.getByText(/arrow keys move it by a semitone or a beat/i)).toBeInTheDocument();
  });

  it("marks a wrong note after the answer is graded", () => {
    const { container } = render(
      <EarTranscriber
        transcriber={{
          notes: [
            { midi: 60, onsetTicks: 0 },
            { midi: 61, onsetTicks: 960 },
          ],
          selected: null,
          canUndo: false,
          canRedo: false,
          select: vi.fn(),
          place: vi.fn(),
          removeAt: vi.fn(),
          nudgePitch: vi.fn(),
          nudgeOnset: vi.fn(),
          clear: vi.fn(),
          undo: vi.fn(),
          redo: vi.fn(),
        }}
        slots={SLOTS}
        isAnswered
        comparison={{
          steps: [
            { kind: "correct", expectedIndex: 0, midi: 60 },
            { kind: "wrong", expectedIndex: 1, expectedMidi: 62, playedMidi: 61, semitoneError: -1 },
          ],
          expectedCount: 2,
          correctCount: 1,
          wrongCount: 1,
          missingCount: 0,
          extraCount: 0,
          accuracy: 0.5,
          isExact: false,
          firstErrorIndex: 1,
        }}
        onPlayAnswer={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".ear-written-note.wrong")).toHaveLength(1);
  });
});

describe("EarTranscriber edge cases", () => {
  it("draws a single-position phrase without dividing by zero", () => {
    const { container } = render(
      <EarTranscriber
        transcriber={{
          notes: [{ midi: 60, onsetTicks: 0 }],
          selected: 0,
          canUndo: false,
          canRedo: false,
          select: vi.fn(),
          place: vi.fn(),
          removeAt: vi.fn(),
          nudgePitch: vi.fn(),
          nudgeOnset: vi.fn(),
          clear: vi.fn(),
          undo: vi.fn(),
          redo: vi.fn(),
        }}
        slots={[0]}
        isAnswered={false}
        comparison={undefined}
        onPlayAnswer={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".ear-written-note")).toHaveLength(1);
    expect(container.querySelector(".ear-note-selection")).not.toBeNull();
  });

  it("ignores a played key when every position is already filled", () => {
    const place = vi.fn();
    render(
      <EarTranscriber
        transcriber={{
          notes: [{ midi: 60, onsetTicks: 0 }],
          selected: null,
          canUndo: false,
          canRedo: false,
          select: vi.fn(),
          place,
          removeAt: vi.fn(),
          nudgePitch: vi.fn(),
          nudgeOnset: vi.fn(),
          clear: vi.fn(),
          undo: vi.fn(),
          redo: vi.fn(),
        }}
        slots={[0]}
        isAnswered={false}
        comparison={undefined}
        onPlayAnswer={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "White piano key E4" }));

    expect(place).not.toHaveBeenCalled();
  });

  it("selects and deselects a position", () => {
    const select = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { select });

    fireEvent.click(screen.getByRole("button", { name: "Position 1, C4" }));
    expect(select).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "Position 2, empty" }));
    expect(select).toHaveBeenCalledWith(null);
  });

  it("deletes the selected note from the button", () => {
    const removeAt = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { selected: 0, removeAt });

    fireEvent.click(screen.getByRole("button", { name: "Delete note" }));

    expect(removeAt).toHaveBeenCalledWith(0);
  });

  it("does nothing on a key press with no position selected", () => {
    const nudgePitch = vi.fn();
    renderEditor([{ midi: 60, onsetTicks: 0 }], { selected: null, nudgePitch });

    fireEvent.keyDown(screen.getByRole("button", { name: "Position 1, C4" }), { key: "ArrowUp" });

    expect(nudgePitch).not.toHaveBeenCalled();
  });

  it("skips a note that has no place on the staff", () => {
    const { container } = renderEditor([{ midi: 9999, onsetTicks: 0 }]);

    expect(container.querySelectorAll(".ear-written-note")).toHaveLength(0);
  });
});
