import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PracticePlan } from "../types";
import PracticeCoach from "./PracticeCoach";

function makePlan(overrides: Partial<PracticePlan> = {}): PracticePlan {
  return {
    tone: "focus",
    title: "Tighten the middle notes",
    focus: "Accuracy first",
    reason: "Your recent rounds show a few unstable notes.",
    target: "Score 24 out of 30",
    steps: ["Name each note before answering.", "Repeat missed notes twice."],
    ...overrides,
  };
}

describe("PracticeCoach", () => {
  it("renders the practice plan title, focus, reason, and target", () => {
    render(<PracticeCoach mode="reading" modeLabel="Note reading" plan={makePlan()} />);

    expect(screen.getByRole("heading", { name: "Tighten the middle notes" })).toBeInTheDocument();
    expect(screen.getByText("Accuracy first")).toBeInTheDocument();
    expect(screen.getByText("Your recent rounds show a few unstable notes.")).toBeInTheDocument();
    expect(screen.getByText("Score 24 out of 30")).toBeInTheDocument();
  });

  it("labels the ordered steps for the current practice mode", () => {
    render(<PracticeCoach mode="pitch" modeLabel="Pitch training" plan={makePlan()} />);

    const steps = screen.getByRole("list", { name: "Pitch training practice plan" });
    expect(steps).toHaveTextContent("Name each note before answering.");
    expect(steps).toHaveTextContent("Repeat missed notes twice.");
  });

  it("applies the plan tone class to the coach card", () => {
    const { container } = render(
      <PracticeCoach mode="reading" modeLabel="Note reading" plan={makePlan({ tone: "steady" })} />,
    );

    expect(container.firstChild).toHaveClass("steady");
  });
});
