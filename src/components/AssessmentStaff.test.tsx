import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AssessmentStaff from "./AssessmentStaff";
import { buildAssessmentPassage } from "../types";

const passage = buildAssessmentPassage({ difficulty: 0.9, seed: "staff-fixture" });

describe("AssessmentStaff", () => {
  it("describes the passage for a screen reader", () => {
    render(<AssessmentStaff passage={passage} position={0} />);

    expect(
      screen.getByRole("img", { name: `Treble staff passage, ${passage.notes.length} notes in ${passage.bars} bars` }),
    ).toBeInTheDocument();
  });

  it("draws every note in the passage", () => {
    const { container } = render(<AssessmentStaff passage={passage} position={0} />);

    expect(container.querySelectorAll(".assessment-note")).toHaveLength(passage.notes.length);
  });

  it("marks where the reader has got to without saying right or wrong", () => {
    const { container } = render(<AssessmentStaff passage={passage} position={3} />);

    expect(container.querySelectorAll(".assessment-note.done")).toHaveLength(3);
    expect(container.querySelectorAll(".assessment-note.current")).toHaveLength(1);
    // Nothing on the staff can be read as a verdict during an assessment.
    expect(container.querySelectorAll(".assessment-note.correct, .assessment-note.wrong")).toHaveLength(0);
  });

  it("draws a barline for every bar", () => {
    const { container } = render(<AssessmentStaff passage={passage} position={0} />);
    const staffLines = container.querySelectorAll("line.staff-line");

    // Five staff lines plus one barline per bar boundary, plus any ledger lines.
    expect(staffLines.length).toBeGreaterThanOrEqual(5 + passage.bars + 1);
  });

  it("shows an accidental when the passage asks for a black key", () => {
    const { container } = render(<AssessmentStaff passage={passage} position={0} />);

    expect(container.querySelectorAll(".assessment-accidental").length).toBeGreaterThan(0);
  });

  it("renders a passage whose notes are all naturals without accidentals", () => {
    const naturalPassage = { ...passage, notes: [{ midi: 60, onsetTicks: 0, durationTicks: 960 }] };

    const { container } = render(<AssessmentStaff passage={naturalPassage} position={0} />);

    expect(container.querySelectorAll(".assessment-accidental")).toHaveLength(0);
  });

  it("skips a note that has no place on the staff rather than drawing nonsense", () => {
    const impossible = { ...passage, notes: [{ midi: 9999, onsetTicks: 0, durationTicks: 960 }] };

    const { container } = render(<AssessmentStaff passage={impossible} position={0} />);

    expect(container.querySelectorAll(".assessment-note")).toHaveLength(0);
  });
});
