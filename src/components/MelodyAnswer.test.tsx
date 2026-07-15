import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPitchNotes } from "../noteData";
import MelodyAnswer from "./MelodyAnswer";

const notes = getPitchNotes().slice(0, 3);

describe("MelodyAnswer", () => {
  it("keeps submit disabled until every slot is filled", () => {
    render(
      <MelodyAnswer
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
    expect(screen.getByRole("button", { name: "Submit melody" })).toBeDisabled();
    expect(screen.getByLabelText("Note 2: empty")).toBeInTheDocument();
  });

  it("supports undo, clear, and submit commands", () => {
    const onUndo = vi.fn();
    const onClear = vi.fn();
    const onSubmit = vi.fn();
    render(
      <MelodyAnswer
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
    fireEvent.click(screen.getByRole("button", { name: "Submit melody" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("marks each revealed melody position", () => {
    const { container } = render(
      <MelodyAnswer
        answerNoteIds={[notes[0]!.id, "G4", notes[2]!.id]}
        feedback={{ answer: "C", answerId: "C4 G4 D4", isCorrect: false }}
        notes={notes}
        reveal
        onClear={vi.fn()}
        onSubmit={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".melody-slots .correct")).toHaveLength(2);
    expect(container.querySelectorAll(".melody-slots .wrong")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});
