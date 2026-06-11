import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BASS_STARTER_NOTES, STARTER_NOTES } from "../noteData";
import MusicStaff from "./MusicStaff";

const STAFF_LINES = 5;
const STEM_LINE = 1;

describe("MusicStaff", () => {
  it("renders an SVG with the note ID in the aria-label", () => {
    const note = STARTER_NOTES[0]!;
    const { container } = render(<MusicStaff note={note} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-label")).toContain(note.id);
  });

  it("labels treble clef notes with the clef in the aria-label", () => {
    const note = STARTER_NOTES[0]!;
    const { container } = render(<MusicStaff note={note} />);
    const label = container.querySelector("svg")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("Treble");
  });

  it("labels bass clef notes with the clef in the aria-label", () => {
    const note = BASS_STARTER_NOTES[0]!;
    const { container } = render(<MusicStaff note={note} />);
    const label = container.querySelector("svg")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("Bass");
  });

  it("renders a ledger line for notes that have one", () => {
    const note = STARTER_NOTES.find((n) => n.ledgerLineY !== undefined)!;
    const { container } = render(<MusicStaff note={note} />);
    expect(container.querySelectorAll("line").length).toBe(STAFF_LINES + STEM_LINE + 1);
  });

  it("renders no ledger line for notes that do not have one", () => {
    const note = STARTER_NOTES.find((n) => n.ledgerLineY === undefined)!;
    const { container } = render(<MusicStaff note={note} />);
    expect(container.querySelectorAll("line").length).toBe(STAFF_LINES + STEM_LINE);
  });
});
