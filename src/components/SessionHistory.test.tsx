import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SessionHistorySummary } from "../types";
import SessionHistory from "./SessionHistory";

function makeSummary(overrides: Partial<SessionHistorySummary> = {}): SessionHistorySummary {
  return {
    recentSessions: [
      {
        id: "session-1",
        mode: "reading",
        completedAt: "2026-06-20T01:00:00.000Z",
        durationSeconds: 70,
        score: 18,
        attempts: 30,
        accuracy: 60,
        bestStreak: 5,
      },
    ],
    averageAccuracy: 60,
    totalAttempts: 30,
    totalPracticeSeconds: 125,
    bestStreak: 5,
    ...overrides,
  };
}

describe("SessionHistory", () => {
  it("shows an empty state before recent sessions exist", () => {
    render(<SessionHistory modeLabel="Note reading" summary={makeSummary({ recentSessions: [] })} />);

    expect(screen.getByText("Finish a round and recent sessions will appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders recent summary metrics", () => {
    render(<SessionHistory modeLabel="Note reading" summary={makeSummary({ averageAccuracy: 74 })} />);

    expect(screen.getByLabelText("Recent practice summary")).toHaveTextContent("Recent avg74%");
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
  });

  it("labels recent session rows by mode, score, attempts, and accuracy", () => {
    render(<SessionHistory modeLabel="Note reading" summary={makeSummary()} />);

    expect(screen.getByRole("list", { name: "Note reading recent sessions" })).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", {
        name: "Note reading session 18 out of 30, 60% accuracy",
      }),
    ).toBeInTheDocument();
  });

  it("falls back for invalid saved session dates", () => {
    render(
      <SessionHistory
        modeLabel="Pitch training"
        summary={makeSummary({
          recentSessions: [
            {
              id: "session-2",
              mode: "pitch",
              completedAt: "not-a-date",
              durationSeconds: 45,
              score: 20,
              attempts: 30,
              accuracy: 67,
              bestStreak: 6,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Saved session")).toBeInTheDocument();
  });
});
