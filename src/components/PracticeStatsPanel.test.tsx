import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { STARTER_NOTES } from "../noteData";
import { defaultSettings } from "../storage";
import type {
  DailyGoalSummary,
  MasterySummary,
  ModeProgress,
  PracticeInsightSummary,
  SessionHistorySummary,
  SessionSummary,
} from "../types";
import PracticeStatsPanel from "./PracticeStatsPanel";

type PracticeStatsPanelProps = ComponentProps<typeof PracticeStatsPanel>;

function firstStarterNote() {
  const note = STARTER_NOTES[0];
  if (!note) {
    throw new Error("Missing starter-note fixture.");
  }

  return note;
}

function makeModeProgress(overrides: Partial<ModeProgress> = {}): ModeProgress {
  return {
    totalAttempts: 12,
    totalCorrect: 9,
    bestRoundScore: 8,
    sessionsCompleted: 2,
    noteStats: {},
    ...overrides,
  };
}

function makeDailyGoal(overrides: Partial<DailyGoalSummary> = {}): DailyGoalSummary {
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

function makeHistory(overrides: Partial<SessionHistorySummary> = {}): SessionHistorySummary {
  return {
    recentSessions: [],
    averageAccuracy: 0,
    totalAttempts: 0,
    totalPracticeSeconds: 0,
    bestStreak: 0,
    ...overrides,
  };
}

function makeInsights(overrides: Partial<PracticeInsightSummary> = {}): PracticeInsightSummary {
  return {
    trendPoints: [],
    latestAccuracy: 0,
    accuracyDelta: 0,
    bestStreak: 0,
    totalPracticeSeconds: 0,
    ...overrides,
  };
}

function makeMastery(overrides: Partial<MasterySummary> = {}): MasterySummary {
  return {
    items: [{ id: "C4", label: "C4", attempts: 0, accuracy: 0, status: "new" }],
    averageAccuracy: 0,
    strongCount: 0,
    totalCount: 1,
    ...overrides,
  };
}

function makeLastSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    mode: "reading",
    score: 7,
    attempts: 10,
    accuracy: 70,
    bestStreak: 4,
    suggestion: "Keep going.",
    ...overrides,
  };
}

function makeProps(overrides: Partial<PracticeStatsPanelProps> = {}): PracticeStatsPanelProps {
  return {
    activeProgress: makeModeProgress(),
    activeView: "overview",
    dailyGoalSummary: makeDailyGoal(),
    focusItems: [],
    historySummary: makeHistory(),
    insightSummary: makeInsights(),
    lastSummary: null,
    lifetimeAccuracy: "75%",
    masterySummary: makeMastery(),
    mode: "reading",
    modeLabel: "Note reading",
    practicePlan: {
      tone: "baseline",
      title: "Build a baseline",
      focus: "New session",
      reason: "Start with a clean read.",
      target: "Finish one round",
      steps: ["Start the drill", "Answer carefully"],
    },
    rangeDetail: "Treble clef C4-G4",
    settings: defaultSettings,
    dataStatus: null,
    onExportData: vi.fn(),
    onImportData: vi.fn(),
    onResetProgress: vi.fn(),
    midi: {
      support: "unsupported" as const,
      status: "unavailable" as const,
      devices: [],
      selectedId: null,
      latencyMs: 0,
      onConnect: () => {},
      onDisconnect: () => {},
      onSelectDevice: () => {},
      onSetLatencyMs: () => {},
    },
    onSettingsChange: vi.fn(),
    ...overrides,
  };
}

describe("PracticeStatsPanel", () => {
  it("renders saved progress, matching last-round summary, and reading range context", () => {
    const props = makeProps({
      lastSummary: makeLastSummary(),
      rangeDetail: "Bass clef C3-G3",
      settings: { ...defaultSettings, readingRange: "bass-starter" },
    });
    const { rerender } = render(<PracticeStatsPanel {...props} />);

    expect(screen.getByRole("complementary", { name: "Practice progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Note reading" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Last round" })).toBeInTheDocument();
    expect(screen.getByText("7/10")).toBeInTheDocument();
    expect(screen.getByText("Keep going.")).toBeInTheDocument();

    rerender(<PracticeStatsPanel {...props} activeView="settings" />);
    expect(screen.getByText("Bass clef C3-G3 note reading.")).toBeInTheDocument();
  });

  it("hides last-round summaries from other modes and describes pitch range", () => {
    render(
      <PracticeStatsPanel
        {...makeProps({
          lastSummary: makeLastSummary({ mode: "reading" }),
          activeView: "settings",
          mode: "pitch",
          modeLabel: "Pitch training",
          rangeDetail: "Chromatic pitches C4-B4",
        })}
      />,
    );

    expect(screen.queryByRole("heading", { level: 3, name: "Last round" })).not.toBeInTheDocument();
    expect(screen.getByText("Chromatic pitches C4-B4 pitch recognition.")).toBeInTheDocument();
  });

  it("switches map and history into separate panel views", () => {
    const props = makeProps({ activeView: "map" });
    const { rerender } = render(<PracticeStatsPanel {...props} />);

    expect(screen.getByRole("heading", { level: 3, name: "Mastery map" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Practice history" })).not.toBeInTheDocument();

    rerender(<PracticeStatsPanel {...props} activeView="history" />);
    expect(screen.getByRole("heading", { level: 3, name: "Practice history" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Practice insight" })).toBeInTheDocument();
  });

  it("sends focused settings patches from length and toggle controls", () => {
    const onSettingsChange = vi.fn();
    render(<PracticeStatsPanel {...makeProps({ activeView: "settings", onSettingsChange })} />);

    fireEvent.click(screen.getByRole("button", { name: "30s" }));
    fireEvent.click(screen.getByLabelText("Adaptive practice"));
    fireEvent.click(screen.getByLabelText("Auto-play pitch"));
    fireEvent.click(screen.getByLabelText("Reveal pitch answer"));

    expect(onSettingsChange).toHaveBeenNthCalledWith(1, { roundLength: 30 });
    expect(onSettingsChange).toHaveBeenNthCalledWith(2, { adaptivePractice: false });
    expect(onSettingsChange).toHaveBeenNthCalledWith(3, { autoPlayPitch: false });
    expect(onSettingsChange).toHaveBeenNthCalledWith(4, { revealPitchAfterAnswer: false });
  });

  it("wires data status, export, import, and reset actions", () => {
    const onExportData = vi.fn();
    const onImportData = vi.fn();
    const onResetProgress = vi.fn();
    const file = new File(["{}"], "notesense-progress.json", { type: "application/json" });

    render(
      <PracticeStatsPanel
        {...makeProps({
          activeView: "data",
          dataStatus: { message: "Progress imported.", tone: "success" },
          onExportData,
          onImportData,
          onResetProgress,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export data" }));
    fireEvent.change(screen.getByLabelText("Import data file"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));

    expect(screen.getByRole("status")).toHaveTextContent("Progress imported.");
    expect(onExportData).toHaveBeenCalledTimes(1);
    expect(onImportData).toHaveBeenCalledWith(file);
    expect(onResetProgress).toHaveBeenCalledTimes(1);
  });

  it("opens the hidden import input from the import button", () => {
    const inputClick = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);

    render(<PracticeStatsPanel {...makeProps({ activeView: "data" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));

    expect(inputClick).toHaveBeenCalledTimes(1);
  });

  it("renders focus items with accuracy and attempt counts", () => {
    render(
      <PracticeStatsPanel
        {...makeProps({
          focusItems: [{ note: firstStarterNote(), accuracy: 40, attempts: 5 }],
        })}
      />,
    );

    const focusItem = screen.getByText("5 tries").closest("li");
    expect(screen.getByRole("heading", { level: 3, name: "Focus notes" })).toBeInTheDocument();
    expect(focusItem).toHaveTextContent("C4");
    expect(focusItem).toHaveTextContent("40%");
    expect(focusItem).toHaveTextContent("5 tries");
  });
});
