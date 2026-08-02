import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadingScoreRunner from "./ReadingScoreRunner";
import { buildAssessmentPassage } from "../types";

const passage = buildAssessmentPassage({ difficulty: 0.35, seed: "runner-fixture" });

type Props = Parameters<typeof ReadingScoreRunner>[0];

function renderRunner(overrides: Partial<Props> = {}) {
  const props: Props = {
    passage,
    status: "idle",
    answeredCount: 0,
    isAudible: true,
    onStart: vi.fn(),
    onFinish: vi.fn(),
    onPlay: vi.fn(),
    ...overrides,
  };
  render(<ReadingScoreRunner {...props} />);
  return props;
}

describe("ReadingScoreRunner", () => {
  it("says what the passage is before the learner commits to it", () => {
    renderRunner();

    expect(screen.getByRole("heading", { name: "Reading Score" })).toBeInTheDocument();
    expect(screen.getByText(/Easy difficulty/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${passage.bpm} bpm`))).toBeInTheDocument();
  });

  it("states the assessment rules up front", () => {
    renderRunner();

    const rules = screen.getByRole("note");
    expect(rules).toHaveTextContent(/have not seen before/i);
    expect(rules).toHaveTextContent(/nothing is marked while you play/i);
  });

  it("starts only when asked", () => {
    const props = renderRunner();

    fireEvent.click(screen.getByRole("button", { name: "Start the assessment" }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it("says the count-in is silent when audio is unavailable", () => {
    renderRunner({ status: "count-in", isAudible: false });

    expect(screen.getByText(/audio is unavailable/i)).toBeInTheDocument();
  });

  it("shows the place in the passage while it runs", () => {
    renderRunner({ status: "running", answeredCount: 3 });

    expect(screen.getByText(`Note 4 of ${passage.notes.length}`)).toBeInTheDocument();
  });

  it("keeps the keyboard inert until the passage is actually running", () => {
    renderRunner({ status: "count-in" });

    // Answering during the count-in would put a note against a beat that has
    // not happened yet.
    for (const key of screen.getAllByRole("button", { name: /piano key/i })) {
      expect(key).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("lets the learner stop part way", () => {
    const props = renderRunner({ status: "running" });

    fireEvent.click(screen.getByRole("button", { name: "Stop here" }));
    expect(props.onFinish).toHaveBeenCalledTimes(1);
  });

  it("reports a played note", () => {
    const props = renderRunner({ status: "running" });

    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    expect(props.onPlay).toHaveBeenCalledWith("C4");
  });
});
