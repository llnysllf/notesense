import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DailyGoalSummary } from "../types";
import DailyGoal from "./DailyGoal";

function makeGoal(overrides: Partial<DailyGoalSummary> = {}): DailyGoalSummary {
  return {
    targetSessions: 1,
    completedSessions: 0,
    completionPercent: 0,
    isComplete: false,
    currentStreak: 0,
    bestStreak: 0,
    todayPracticeSeconds: 0,
    nextAction: "Finish 1 more round today.",
    ...overrides,
  };
}

describe("DailyGoal", () => {
  it("renders the session count", () => {
    render(<DailyGoal summary={makeGoal({ completedSessions: 0, targetSessions: 1 })} />);
    expect(screen.getByText(/0\/1/)).toBeInTheDocument();
  });

  it("renders the next-action message", () => {
    render(<DailyGoal summary={makeGoal({ nextAction: "Finish 1 more round today." })} />);
    expect(screen.getByText("Finish 1 more round today.")).toBeInTheDocument();
  });

  it("shows today's practice time", () => {
    render(<DailyGoal summary={makeGoal({ todayPracticeSeconds: 75 })} />);
    expect(screen.getByText("1m 15s")).toBeInTheDocument();
  });

  it("applies the complete class when the goal is done", () => {
    const { container } = render(<DailyGoal summary={makeGoal({ isComplete: true })} />);
    expect(container.firstChild).toHaveClass("complete");
  });

  it("does not apply the complete class when unfinished", () => {
    const { container } = render(<DailyGoal summary={makeGoal({ isComplete: false })} />);
    expect(container.firstChild).not.toHaveClass("complete");
  });

  it("renders streak counts", () => {
    render(<DailyGoal summary={makeGoal({ currentStreak: 3, bestStreak: 7 })} />);
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("uses singular day for a streak of one", () => {
    render(<DailyGoal summary={makeGoal({ currentStreak: 1, bestStreak: 1 })} />);
    const dayLabels = screen.getAllByText("1 day");
    expect(dayLabels).toHaveLength(2);
  });

  it("renders the progress meter with correct aria attributes", () => {
    render(<DailyGoal summary={makeGoal({ completionPercent: 50 })} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "50");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });
});
