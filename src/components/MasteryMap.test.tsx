import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MasterySummary } from "../types";
import MasteryMap from "./MasteryMap";

function makeSummary(overrides: Partial<MasterySummary> = {}): MasterySummary {
  return {
    items: [
      { id: "C4", label: "C4", attempts: 0, accuracy: 0, status: "new" },
      { id: "D4", label: "D4", attempts: 10, accuracy: 90, status: "strong" },
      { id: "E4", label: "E4", attempts: 8, accuracy: 50, status: "focus" },
    ],
    averageAccuracy: 70,
    strongCount: 1,
    totalCount: 3,
    ...overrides,
  };
}

describe("MasteryMap", () => {
  it("renders an item for each note in the summary", () => {
    render(<MasteryMap mode="reading" modeLabel="Note reading" summary={makeSummary()} />);
    expect(screen.getByRole("listitem", { name: /C4/i })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /D4/i })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /E4/i })).toBeInTheDocument();
  });

  it("renders the average accuracy", () => {
    render(<MasteryMap mode="reading" modeLabel="Note reading" summary={makeSummary({ averageAccuracy: 82 })} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("shows the strong-note count when there is at least one", () => {
    render(
      <MasteryMap mode="pitch" modeLabel="Pitch training" summary={makeSummary({ strongCount: 2, totalCount: 5 })} />,
    );
    expect(screen.getByText(/2 strong out of 5/)).toBeInTheDocument();
  });

  it("shows the baseline message when no notes are strong yet", () => {
    render(<MasteryMap mode="reading" modeLabel="Note reading" summary={makeSummary({ strongCount: 0 })} />);
    expect(screen.getByText(/Build a few strong notes/)).toBeInTheDocument();
  });

  it("labels new notes accessibly with no attempts", () => {
    render(<MasteryMap mode="reading" modeLabel="Note reading" summary={makeSummary()} />);
    expect(screen.getByRole("listitem", { name: /C4 New, no attempts yet/i })).toBeInTheDocument();
  });

  it("labels practised notes with accuracy and attempts", () => {
    render(<MasteryMap mode="reading" modeLabel="Note reading" summary={makeSummary()} />);
    expect(screen.getByRole("listitem", { name: /D4 Strong, 90% accuracy across 10 attempts/i })).toBeInTheDocument();
  });
});
