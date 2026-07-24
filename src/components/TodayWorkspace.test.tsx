import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { generateDailyMix } from "../dailyMix";
import { defaultSettings } from "../storage";
import { emptyProgress } from "../noteData";
import { BUILT_IN_SONGS } from "../songLibraryData";
import TodayWorkspace from "./TodayWorkspace";
import type { DailyGoalSummary, DailyMix } from "../types";

const GOAL: DailyGoalSummary = {
  targetSessions: 1,
  completedSessions: 0,
  completionPercent: 0,
  isComplete: false,
  currentStreak: 0,
  bestStreak: 0,
  todayPracticeSeconds: 0,
  nextAction: "Finish 1 round today.",
};

const MIX = generateDailyMix({
  progress: emptyProgress,
  songProgress: {},
  settings: defaultSettings,
  songs: BUILT_IN_SONGS,
  now: new Date("2026-07-24T09:00:00.000Z"),
});

type Props = Parameters<typeof TodayWorkspace>[0];

function renderToday(overrides: Partial<Props> = {}) {
  const props: Props = {
    mix: MIX,
    dailyGoalSummary: GOAL,
    onStartSegment: vi.fn(),
    onRegenerate: vi.fn(),
    ...overrides,
  };
  return { ...render(<TodayWorkspace {...props} />), props };
}

function withCompleted(ids: string[]): DailyMix {
  return { ...MIX, completedSegmentIds: ids };
}

describe("TodayWorkspace", () => {
  it("renders the daily goal and three mix cards with role badges", () => {
    renderToday();

    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Daily goal" })).toBeInTheDocument();
    expect(screen.getByText("Weak spot")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("For fun")).toBeInTheDocument();
    expect(screen.getByText("Your daily mix — 0/3 done")).toBeInTheDocument();
  });

  it("starts a segment and shuffles the mix", () => {
    const { props } = renderToday();

    fireEvent.click(screen.getByRole("button", { name: `Start ${MIX.segments[0]!.title}` }));
    expect(props.onStartSegment).toHaveBeenCalledWith(MIX.segments[0]);

    fireEvent.click(screen.getByRole("button", { name: "Shuffle mix" }));
    expect(props.onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("shows a done state instead of a start button for completed segments", () => {
    renderToday({ mix: withCompleted([MIX.segments[0]!.id]) });

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Start ${MIX.segments[0]!.title}` })).not.toBeInTheDocument();
    expect(screen.getByText("Your daily mix — 1/3 done")).toBeInTheDocument();
  });

  it("celebrates when every segment is complete", () => {
    renderToday({ mix: withCompleted(MIX.segments.map((segment) => segment.id)) });

    expect(screen.getByRole("status")).toHaveTextContent("Daily mix complete");
  });

  it("shows a loading state while the mix is being built", () => {
    renderToday({ mix: null });

    expect(screen.getByText("Building your daily mix…")).toBeInTheDocument();
    expect(screen.getByText("Preparing your exercises…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shuffle mix" })).toBeDisabled();
  });
});
