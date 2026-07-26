import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlanCompletion } from "./usePlanCompletion";
import type { SessionSummary } from "../types";

const summary = (mode: "reading" | "pitch"): SessionSummary => ({
  mode,
  score: 5,
  attempts: 6,
  accuracy: 83,
  bestStreak: 3,
  suggestion: "Keep going",
});

function Probe({
  lastSummary,
  songStatus,
  completeActivity,
}: {
  lastSummary: SessionSummary | null;
  songStatus: string;
  completeActivity: (activity: "reading" | "pitch" | "songs") => void;
}) {
  usePlanCompletion({ lastSummary, songStatus, completeActivity });
  return null;
}

describe("usePlanCompletion", () => {
  it("credits nothing while no activity has finished", () => {
    const completeActivity = vi.fn();
    render(<Probe lastSummary={null} songStatus="idle" completeActivity={completeActivity} />);

    expect(completeActivity).not.toHaveBeenCalled();
  });

  it("credits the drill that finished", () => {
    const completeActivity = vi.fn();
    const { rerender } = render(<Probe lastSummary={null} songStatus="idle" completeActivity={completeActivity} />);

    rerender(<Probe lastSummary={summary("reading")} songStatus="idle" completeActivity={completeActivity} />);
    expect(completeActivity).toHaveBeenCalledWith("reading");

    rerender(<Probe lastSummary={summary("pitch")} songStatus="idle" completeActivity={completeActivity} />);
    expect(completeActivity).toHaveBeenCalledWith("pitch");
  });

  it("credits songs only once a song is complete", () => {
    const completeActivity = vi.fn();
    const { rerender } = render(<Probe lastSummary={null} songStatus="wrong" completeActivity={completeActivity} />);
    expect(completeActivity).not.toHaveBeenCalled();

    rerender(<Probe lastSummary={null} songStatus="complete" completeActivity={completeActivity} />);
    expect(completeActivity).toHaveBeenCalledWith("songs");
  });
});
