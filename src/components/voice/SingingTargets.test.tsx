import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SingingTargets from "./SingingTargets";
import { buildSingingExercise, type SungScore } from "../../types";

const RANGE = { version: 1, lowMidi: 55, highMidi: 69 };
const exercise = buildSingingExercise({ stageId: "short-phrase", range: RANGE, seed: "targets" });

function scoreFor(perNote: SungScore["perNote"]): SungScore {
  return {
    components: { pitchCentre: 1, pitchStability: 1, transitions: 1, rhythm: 1, completion: 1 },
    total: 1,
    perNote,
    summary: { centsError: 0, stability: 1, onsetErrorMs: 0, durationError: 0, inTune: true },
  };
}

describe("SingingTargets", () => {
  it("describes the phrase in words rather than drawing a waveform", () => {
    render(<SingingTargets exercise={exercise} score={null} referenceLabel="C4" />);

    // A waveform shows loudness, which tells a singer nothing they can act on.
    expect(screen.getByRole("img", { name: /Phrase to sing: [A-G]/ })).toBeInTheDocument();
    expect(screen.getByText("Starts on C4")).toBeInTheDocument();
  });

  it("reads back how each note went once graded", () => {
    const perNote = exercise.targets.map((target, index) => ({
      targetMidi: target.midi,
      sung: index < 2,
      sungMidi: target.midi,
      centsError: index === 0 ? 12 : -40,
      onsetErrorMs: 0,
    }));

    render(<SingingTargets exercise={exercise} score={scoreFor(perNote)} referenceLabel="C4" />);

    const label = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Note 1 sung 12 cents sharp/);
    expect(label).toMatch(/Note 2 sung 40 cents flat/);
    expect(label).toMatch(/Note 3 not sung/);
  });

  it("skips a target that has no place on the staff", () => {
    const impossible = { ...exercise, targets: [{ midi: 9999, onsetSeconds: 0, durationSeconds: 1 }] };

    const { container } = render(<SingingTargets exercise={impossible} score={null} referenceLabel="C4" />);

    expect(container.querySelectorAll(".singing-note")).toHaveLength(0);
  });

  it("lays a single-note phrase out without dividing by zero", () => {
    const single = { ...exercise, targets: [exercise.targets[0] as (typeof exercise.targets)[number]] };

    const { container } = render(<SingingTargets exercise={single} score={null} referenceLabel="C4" />);

    expect(container.querySelectorAll(".singing-note")).toHaveLength(1);
  });
});
