import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PIANO_WHITE_KEY_COUNT } from "../noteData";
import PianoKeybed from "./PianoKeybed";
import { FULL_BLACK_KEYS, FULL_WHITE_KEYS } from "./pianoKeyboardLayout";

type KeybedProps = Parameters<typeof PianoKeybed>[0];

function renderKeybed(overrides: Partial<KeybedProps> = {}) {
  const props: KeybedProps = {
    whiteKeys: FULL_WHITE_KEYS,
    blackKeys: FULL_BLACK_KEYS,
    whiteKeyStart: 0,
    whiteKeyCount: PIANO_WHITE_KEY_COUNT,
    disabled: false,
    selectedNoteId: undefined,
    revealedNoteId: undefined,
    isCorrect: undefined,
    onKeySelect: vi.fn(),
    ...overrides,
  };

  return { ...render(<PianoKeybed {...props} />), props };
}

describe("PianoKeybed", () => {
  it("labels octave boundaries with full ids and other keys with note names", () => {
    renderKeybed();

    expect(screen.getByRole("button", { name: "White piano key A0" })).toHaveTextContent("A0");
    expect(screen.getByRole("button", { name: "White piano key C8" })).toHaveTextContent("C8");
    expect(screen.getByRole("button", { name: "White piano key C4" })).toHaveTextContent("C4");
    expect(screen.getByRole("button", { name: "White piano key D4" })).toHaveTextContent(/^D$/);
  });

  it("selects keys when enabled and ignores them when disabled", () => {
    const onKeySelect = vi.fn();
    const { rerender, props } = renderKeybed({ onKeySelect });

    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    expect(onKeySelect).toHaveBeenCalledWith("C4");

    rerender(<PianoKeybed {...props} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    expect(onKeySelect).toHaveBeenCalledTimes(1);
  });

  it("disables keys outside the selectable set", () => {
    const onKeySelect = vi.fn();
    renderKeybed({ onKeySelect, selectableKeyIds: new Set(["C4"]) });

    const insideKey = screen.getByRole("button", { name: "White piano key C4" });
    const outsideKey = screen.getByRole("button", { name: "White piano key D4" });

    expect(insideKey).toHaveAttribute("aria-disabled", "false");
    expect(outsideKey).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(outsideKey);
    expect(onKeySelect).not.toHaveBeenCalled();
  });

  it("lets an unavailable black key pass pointer clicks through to a selectable white key", () => {
    renderKeybed({ selectableKeyIds: new Set(["B4"]) });

    expect(screen.getByRole("button", { name: "Black piano key A#4" })).toHaveClass("piano-key-pass-through");
    expect(screen.getByRole("button", { name: "White piano key B4" })).not.toHaveClass("piano-key-pass-through");
  });

  it("describes selection feedback in class and aria label", () => {
    renderKeybed({ selectedNoteId: "C4", isCorrect: true });

    const correctKey = screen.getByRole("button", { name: "White piano key C4, selected correct" });
    expect(correctKey).toHaveClass("selected-correct");

    renderKeybed({ selectedNoteId: "D#4", isCorrect: false });
    const wrongKey = screen.getByRole("button", { name: "Black piano key D#4, selected incorrect" });
    expect(wrongKey).toHaveClass("selected-wrong");
  });

  it("marks the revealed target key", () => {
    renderKeybed({ revealedNoteId: "G4" });

    expect(screen.getByRole("button", { name: "White piano key G4, target note" })).toHaveClass("target-key");
  });

  it("describes custom range membership and boundaries", () => {
    renderKeybed({
      rangeNoteIds: new Set(["G3", "A3", "B3", "C4"]),
      rangeStartNoteId: "G3",
      rangeEndNoteId: "C4",
      activeRangeEdge: "end",
    });

    const startKey = screen.getByRole("button", {
      name: "White piano key G3, inside selected range, range start",
    });
    const endKey = screen.getByRole("button", {
      name: "White piano key C4, inside selected range, range end",
    });
    const middleKey = screen.getByRole("button", { name: "White piano key A3, inside selected range" });

    expect(startKey).toHaveClass("range-key", "range-boundary", "range-start");
    expect(endKey).toHaveClass("range-key", "range-boundary", "range-active-boundary");
    expect(middleKey).toHaveClass("range-key");
  });

  it("positions black keys with per-key offsets", () => {
    renderKeybed();

    const blackKey = screen.getByRole("button", { name: "Black piano key C#4" });
    expect(blackKey.style.getPropertyValue("--black-key-left")).not.toEqual("");
  });
});
