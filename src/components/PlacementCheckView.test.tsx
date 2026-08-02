import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlacementCheckView from "./PlacementCheckView";
import { startPlacement, type PlacementOutcome } from "../types";

const outcome: PlacementOutcome = {
  version: 1,
  difficulty: 0.4,
  band: "easy",
  confidence: 0.55,
  itemsAnswered: 6,
  stopReason: "confident",
  explanation: "Your answers settled around this level, so this is where practice will start.",
  isProvisional: true,
};

type Props = Parameters<typeof PlacementCheckView>[0];

function renderCheck(overrides: Partial<Props> = {}) {
  const props: Props = {
    state: startPlacement(),
    promptNoteId: "C4",
    isComplete: false,
    outcome: undefined,
    startingPoint: undefined,
    saved: undefined,
    storageWarning: false,
    onAnswer: vi.fn(),
    onRestart: vi.fn(),
    onAccept: vi.fn(),
    onSkip: vi.fn(),
    ...overrides,
  };
  render(<PlacementCheckView {...props} />);
  return props;
}

describe("PlacementCheckView", () => {
  it("says what the check is for and that it can be skipped", () => {
    renderCheck();

    expect(screen.getByRole("heading", { name: "Where should you start?" })).toBeInTheDocument();
    expect(screen.getByText(/you can skip it/i)).toBeInTheDocument();
  });

  it("lets the learner leave without finishing", () => {
    const props = renderCheck();

    fireEvent.click(screen.getByRole("button", { name: "Skip the check" }));
    expect(props.onSkip).toHaveBeenCalledTimes(1);
  });

  it("shows the note being asked about", () => {
    renderCheck({ promptNoteId: "E4" });

    expect(screen.getByRole("img", { name: /staff note E4/i })).toBeInTheDocument();
  });

  it("reports a played answer", () => {
    const props = renderCheck();

    fireEvent.click(screen.getByRole("button", { name: "White piano key D4" }));
    expect(props.onAnswer).toHaveBeenCalledWith("D4");
  });

  it("counts the questions so the learner can see it is short", () => {
    renderCheck();

    expect(screen.getByText("Question 1")).toBeInTheDocument();
  });

  it("presents the result as a starting point, never as a verdict", () => {
    renderCheck({
      isComplete: true,
      outcome,
      startingPoint: {
        difficulty: 0.4,
        band: "easy",
        lowMidi: 57,
        highMidi: 76,
        bpm: 72,
        summary: "Starting at easy difficulty, 4 bars at 72 bpm.",
      },
    });

    expect(screen.getByText("Starting at easy difficulty, 4 bars at 72 bpm.")).toBeInTheDocument();
    const caveat = screen.getByRole("note");
    expect(caveat).toHaveTextContent(/not a measurement of what you can do/i);
    expect(caveat).toHaveTextContent(/you can change it yourself/i);
  });

  it("lets the learner accept the starting point or check again", () => {
    const props = renderCheck({
      isComplete: true,
      outcome,
      startingPoint: {
        difficulty: 0.4,
        band: "easy",
        lowMidi: 57,
        highMidi: 76,
        bpm: 72,
        summary: "Starting at easy difficulty, 4 bars at 72 bpm.",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Start here" }));
    expect(props.onAccept).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it("mentions a previous placement without blocking a new one", () => {
    renderCheck({ saved: outcome });

    expect(screen.getByRole("note")).toHaveTextContent(/last placed at easy difficulty/i);
    expect(screen.getByRole("button", { name: "Skip the check" })).toBeInTheDocument();
  });

  it("says when the starting point could not be saved", () => {
    renderCheck({
      isComplete: true,
      outcome,
      storageWarning: true,
      startingPoint: {
        difficulty: 0.4,
        band: "easy",
        lowMidi: 57,
        highMidi: 76,
        bpm: 72,
        summary: "Starting at easy difficulty, 4 bars at 72 bpm.",
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(/could not be saved/i);
  });
});
