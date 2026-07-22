import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPitchNotes } from "../noteData";
import PitchSequenceAnswer from "./PitchSequenceAnswer";

const notes = getPitchNotes().slice(0, 3);

describe("PitchSequenceAnswer", () => {
  it("shows entered notes on a staff and keeps submit disabled until the sequence is complete", () => {
    const { container } = render(
      <PitchSequenceAnswer
        answerNoteIds={["C4"]}
        feedback={null}
        notes={notes}
        reveal={false}
        onClear={vi.fn()}
        onSubmit={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit sequence" })).toBeDisabled();
    expect(screen.getByRole("img", { name: /1 of 3 notes entered.*C4/ })).toBeInTheDocument();
    expect(container.querySelector('[data-note-id="C4"]')).toBeInTheDocument();
    expect(container.querySelectorAll(".sequence-empty-position")).toHaveLength(2);
  });

  it("supports undo, clear, and submit commands", () => {
    const onUndo = vi.fn();
    const onClear = vi.fn();
    const onSubmit = vi.fn();
    render(
      <PitchSequenceAnswer
        answerNoteIds={notes.map((note) => note.id)}
        feedback={null}
        notes={notes}
        reveal={false}
        onClear={onClear}
        onSubmit={onSubmit}
        onUndo={onUndo}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit sequence" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("marks every scored position and overlays the expected note for a revealed mistake", () => {
    const { container } = render(
      <PitchSequenceAnswer
        answerNoteIds={[notes[0]!.id, "G4", notes[2]!.id]}
        feedback={{ answer: "C", answerId: "C4 G4 D4", isCorrect: false }}
        notes={notes}
        reveal
        onClear={vi.fn()}
        onSubmit={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".sequence-written-note.correct")).toHaveLength(2);
    expect(container.querySelectorAll(".sequence-written-note.wrong")).toHaveLength(1);
    expect(container.querySelectorAll(".sequence-written-note.target")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("wraps longer sequences and keeps extreme piano notes readable with octave notation", () => {
    const longNotes = getPitchNotes("full").slice(0, 12);
    const { container } = render(
      <PitchSequenceAnswer
        answerNoteIds={["A0", "C8"]}
        feedback={null}
        notes={longNotes}
        reveal={false}
        onClear={vi.fn()}
        onSubmit={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    expect(container.querySelectorAll("[data-sequence-system]")).toHaveLength(2);
    expect(container).toHaveTextContent("15mb");
    expect(container).toHaveTextContent("22ma");
  });
});
