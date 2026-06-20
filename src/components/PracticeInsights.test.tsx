import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PracticeInsightSummary } from "../types";
import PracticeInsights from "./PracticeInsights";

function makeSummary(overrides: Partial<PracticeInsightSummary> = {}): PracticeInsightSummary {
  return {
    trendPoints: [
      {
        id: "round-1",
        label: "Round 1",
        completedAt: "2026-06-20T01:00:00.000Z",
        accuracy: 60,
        score: 18,
        attempts: 30,
      },
      {
        id: "round-2",
        label: "Round 2",
        completedAt: "2026-06-20T02:00:00.000Z",
        accuracy: 72,
        score: 22,
        attempts: 30,
      },
    ],
    latestAccuracy: 72,
    accuracyDelta: 12,
    bestStreak: 8,
    totalPracticeSeconds: 125,
    ...overrides,
  };
}

describe("PracticeInsights", () => {
  it("shows an empty state before trend data exists", () => {
    render(<PracticeInsights modeLabel="Note reading" summary={makeSummary({ trendPoints: [] })} />);

    expect(screen.getByText("Finish a round and NoteSense will chart the recent trend.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders trend metrics with signed accuracy delta and formatted time", () => {
    render(<PracticeInsights modeLabel="Pitch training" summary={makeSummary()} />);

    expect(screen.getByLabelText("Pitch training trend metrics")).toHaveTextContent("Latest72%");
    expect(screen.getByText("+12%")).toHaveClass("positive");
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
  });

  it("labels the trend chart with mode, round count, and latest accuracy", () => {
    render(<PracticeInsights modeLabel="Pitch training" summary={makeSummary()} />);

    expect(
      screen.getByRole("img", {
        name: "Pitch training accuracy trend across 2 saved rounds, latest 72 percent.",
      }),
    ).toBeInTheDocument();
  });

  it("uses a negative tone for accuracy drops", () => {
    render(<PracticeInsights modeLabel="Note reading" summary={makeSummary({ accuracyDelta: -5 })} />);

    expect(screen.getByText("-5%")).toHaveClass("negative");
  });
});
