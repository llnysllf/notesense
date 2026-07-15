import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getPitchNotes } from "../noteData";
import MelodyPrompt from "./MelodyPrompt";

const notes = getPitchNotes().slice(0, 3);

describe("MelodyPrompt", () => {
  it("hides the sequence before feedback", () => {
    render(<MelodyPrompt notes={notes} reveal={false} />);

    expect(screen.getByLabelText("Hidden 3-note melody")).toBeInTheDocument();
    expect(screen.getByText("3 notes")).toBeInTheDocument();
  });

  it("reveals the exact sequence after feedback", () => {
    render(<MelodyPrompt notes={notes} reveal />);

    expect(screen.getByLabelText(`Melody notes ${notes.map((note) => note.id).join(", ")}`)).toBeInTheDocument();
    notes.forEach((note) => expect(screen.getByText(note.id)).toBeInTheDocument());
  });
});
