import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PianoKeyboard from "./PianoKeyboard";

describe("PianoKeyboard", () => {
  it("renders the complete 88-key piano as disabled controls before a round starts", () => {
    render(<PianoKeyboard disabled onKeySelect={vi.fn()} />);

    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(88);
    expect(screen.getByRole("button", { name: "White piano key A0" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Black piano key C#4" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "White piano key C8" })).toHaveAttribute("aria-disabled", "true");
  });

  it("ignores key clicks while disabled", () => {
    const onKeySelect = vi.fn();

    render(<PianoKeyboard disabled onKeySelect={onKeySelect} />);
    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));

    expect(onKeySelect).not.toHaveBeenCalled();
  });

  it("selects the exact piano key id", () => {
    const onKeySelect = vi.fn();

    render(<PianoKeyboard disabled={false} onKeySelect={onKeySelect} />);
    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    fireEvent.click(screen.getByRole("button", { name: "Black piano key C#4" }));

    expect(onKeySelect).toHaveBeenNthCalledWith(1, "C4");
    expect(onKeySelect).toHaveBeenNthCalledWith(2, "C#4");
  });

  it("marks the selected key and revealed target key after an incorrect answer", () => {
    render(<PianoKeyboard disabled isCorrect={false} revealedNoteId="C4" selectedNoteId="C3" onKeySelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "White piano key C3, selected incorrect" })).toHaveClass(
      "selected-wrong",
    );
    expect(screen.getByRole("button", { name: "White piano key C4, target note" })).toHaveClass("target-key");
  });
});
