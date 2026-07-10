import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PITCH_NOTES, TREBLE_STARTER_NOTES } from "../noteData";
import PracticeWorkspace from "./PracticeWorkspace";

type WorkspaceProps = Parameters<typeof PracticeWorkspace>[0];

function renderWorkspace(overrides: Partial<WorkspaceProps> = {}) {
  const props: WorkspaceProps = {
    currentPitchNote: PITCH_NOTES[0]!,
    currentReadingNote: TREBLE_STARTER_NOTES[0]!,
    currentStreak: 2,
    dataStatus: null,
    feedback: null,
    feedbackClass: "",
    feedbackText: "Ready",
    isRunning: false,
    keyboardResetKey: "round-1",
    mode: "reading",
    promptDetail: "Adaptive | Treble clef C4-G4",
    rangeControls: <div data-testid="range-controls" />,
    roundAccuracy: "0%",
    roundAttempts: 0,
    roundCorrect: 0,
    shouldRevealPitch: false,
    timeRemaining: 60,
    onAnswer: vi.fn(),
    onFinishRound: vi.fn(),
    onModeChange: vi.fn(),
    onReadingKeyAnswer: vi.fn(),
    onStartRound: vi.fn(),
    ...overrides,
  };

  return { ...render(<PracticeWorkspace {...props} />), props };
}

describe("PracticeWorkspace", () => {
  it("renders the reading workspace with staff, piano, range controls, and round stats", () => {
    renderWorkspace();

    expect(screen.getByRole("region", { name: "Practice drill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Note reading" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("range-controls")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
    expect(screen.getByText("Find this note on the piano.")).toBeInTheDocument();
    expect(screen.getByText("Adaptive | Treble clef C4-G4")).toBeInTheDocument();
    expect(screen.getByText("60s")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
  });

  it("switches practice modes", () => {
    const onModeChange = vi.fn();
    renderWorkspace({ onModeChange });

    fireEvent.click(screen.getByRole("button", { name: "Pitch training" }));
    expect(onModeChange).toHaveBeenCalledWith("pitch");
  });

  it("renders the pitch workspace with answer buttons and no range controls", () => {
    const onAnswer = vi.fn();
    renderWorkspace({ mode: "pitch", isRunning: true, onAnswer });

    expect(screen.getByText("Name the pitch you hear.")).toBeInTheDocument();
    expect(screen.queryByTestId("range-controls")).not.toBeInTheDocument();

    const answerButtons = screen.getAllByRole("button", { name: /^Answer / });
    expect(answerButtons).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "Answer C" }));
    expect(onAnswer).toHaveBeenCalledWith("C");
  });

  it("disables pitch answers while idle or after feedback", () => {
    renderWorkspace({ mode: "pitch", isRunning: false });
    expect(screen.getByRole("button", { name: "Answer C" })).toBeDisabled();

    renderWorkspace({
      mode: "pitch",
      isRunning: true,
      feedback: { answer: "C", isCorrect: true },
    });
    const [, secondAnswerSet] = screen.getAllByRole("button", { name: "Answer C" });
    expect(secondAnswerSet).toBeDisabled();
  });

  it("shows the data status message when present", () => {
    renderWorkspace({ dataStatus: { message: "Progress is not being saved.", tone: "warning" } });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Progress is not being saved.");
    expect(status).toHaveClass("data-status", "warning");
  });

  it("announces feedback text", () => {
    renderWorkspace({ feedbackText: "Correct! C4", feedbackClass: "correct" });

    const feedback = screen.getByTestId("practice-feedback");
    expect(feedback).toHaveTextContent("Correct! C4");
    expect(feedback).toHaveClass("feedback", "correct");
  });

  it("starts and restarts rounds", () => {
    const onStartRound = vi.fn();
    renderWorkspace({ onStartRound });

    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    expect(onStartRound).toHaveBeenCalledTimes(1);

    renderWorkspace({ isRunning: true });
    expect(screen.getByRole("button", { name: "Restart round" })).toBeInTheDocument();
  });

  it("finishes a running round", () => {
    const onFinishRound = vi.fn();
    renderWorkspace({ isRunning: true, onFinishRound });

    fireEvent.click(screen.getByRole("button", { name: "Finish round" }));
    expect(onFinishRound).toHaveBeenCalledTimes(1);
  });

  it("hides the finish button while idle", () => {
    renderWorkspace({ isRunning: false });

    expect(screen.queryByRole("button", { name: "Finish round" })).not.toBeInTheDocument();
  });

  it("forwards reading key answers to the piano keyboard", () => {
    const onReadingKeyAnswer = vi.fn();
    renderWorkspace({ isRunning: true, onReadingKeyAnswer });

    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    expect(onReadingKeyAnswer).toHaveBeenCalledWith("C4");
  });
});
