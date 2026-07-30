import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodayWorkspace from "./TodayWorkspace";
import { planProgress, type DailyPlan } from "../types";

const plan: DailyPlan = {
  planVersion: 1,
  localDate: "2026-05-14",
  curriculumVersion: 1,
  generatedAtIso: "2026-05-14T09:00:00.000Z",
  estimatedSeconds: 480,
  blocks: [
    {
      id: "review-0",
      role: "review",
      activity: "reading",
      title: "Review",
      reason: "Reviewing this because it has become less certain.",
      estimatedSeconds: 180,
    },
    {
      id: "focus-1",
      role: "focus",
      activity: "pitch",
      title: "Focus",
      reason: "Practising this because recent answers have been shaky.",
      estimatedSeconds: 180,
    },
    {
      id: "confidence-2",
      role: "confidence",
      activity: "songs",
      title: "Play something",
      reason: "Finish with a song you enjoy.",
      estimatedSeconds: 120,
    },
  ],
  completedBlockIds: [],
};

const renderToday = (over: Partial<DailyPlan> = {}) => {
  const next = { ...plan, ...over };
  const onOpenBlock = vi.fn();
  render(<TodayWorkspace plan={next} progress={planProgress(next)} onOpenBlock={onOpenBlock} />);
  return { onOpenBlock };
};

describe("TodayWorkspace", () => {
  it("shows every block with the reason it was chosen", () => {
    renderToday();

    expect(screen.getByRole("heading", { name: "Your plan for today" })).toBeInTheDocument();
    expect(screen.getByText("Reviewing this because it has become less certain.")).toBeInTheDocument();
    expect(screen.getByText("Practising this because recent answers have been shaky.")).toBeInTheDocument();
    expect(screen.getByText("Finish with a song you enjoy.")).toBeInTheDocument();
  });

  it("summarises progress and time left", () => {
    renderToday();

    expect(screen.getByText(/0 of 3 done/)).toBeInTheDocument();
    expect(screen.getByText(/8 min left/)).toBeInTheDocument();
  });

  it("links each block to the screen that runs it", () => {
    renderToday();

    const links = screen.getAllByRole("link", { name: "Start" });
    expect(links[0]).toHaveAttribute("href", "/practice/reading");
    expect(links[1]).toHaveAttribute("href", "/practice/pitch");
    expect(links[2]).toHaveAttribute("href", "/practice/songs");
  });

  it("reports which block the learner opened", () => {
    const { onOpenBlock } = renderToday();

    fireEvent.click(screen.getAllByRole("link", { name: "Start" })[1] as HTMLElement);

    expect(onOpenBlock).toHaveBeenCalledWith("focus-1");
  });

  it("marks finished blocks as done and drops their start link", () => {
    renderToday({ completedBlockIds: ["review-0"] });

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Start" })).toHaveLength(2);
    expect(screen.getByText(/1 of 3 done/)).toBeInTheDocument();
  });

  it("celebrates a finished plan without demanding more", () => {
    renderToday({ completedBlockIds: ["review-0", "focus-1", "confidence-2"] });

    expect(screen.getByRole("status")).toHaveTextContent("Plan complete");
    expect(screen.queryByRole("link", { name: "Start" })).not.toBeInTheDocument();
  });
});
