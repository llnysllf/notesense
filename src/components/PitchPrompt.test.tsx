import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PitchNote } from "../types";
import PitchPrompt from "./PitchPrompt";

const note: PitchNote = {
  id: "C4",
  name: "C",
  octave: 4,
  frequency: 261.63,
  keyboardShortcut: "a",
};

describe("PitchPrompt", () => {
  it("hides the pitch note until reveal is enabled", () => {
    render(<PitchPrompt note={note} reveal={false} />);

    expect(screen.getByLabelText("Hidden pitch note")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.queryByText("C4")).not.toBeInTheDocument();
  });

  it("reveals the pitch note with an accessible label", () => {
    render(<PitchPrompt note={note} reveal />);

    expect(screen.getByLabelText("Pitch note C4")).toBeInTheDocument();
    expect(screen.getByText("C4")).toBeInTheDocument();
  });

  it("keeps the decorative music mark hidden from assistive technology", () => {
    const { container } = render(<PitchPrompt note={note} reveal={false} />);

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("♪");
  });
});
