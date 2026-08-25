import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TREBLE_STARTER_NOTES, getPitchNotes } from "../noteData";
import PracticeWorkspace from "./PracticeWorkspace";

type WorkspaceProps = Parameters<typeof PracticeWorkspace>[0];

function renderWorkspace(overrides: Partial<WorkspaceProps> = {}) {
  const pitchNotes = getPitchNotes();
  const props: WorkspaceProps = {
    currentPitchNote: pitchNotes[0]!,
    currentMelody: pitchNotes.slice(0, 3),
    currentReadingNote: TREBLE_STARTER_NOTES[0]!,
    currentStreak: 2,
    dataStatus: null,
    readingMisses: [],
    feedback: null,
    feedbackClass: "",
    feedbackText: "Ready",
    isRunning: false,
    keyboardResetKey: "round-1",
    lookAheadReadingNote: null,
    melodyAnswerNoteIds: [],
    mode: "reading",
    pitchExercise: "single",
    pitchRangeNoteIds: new Set(pitchNotes.map((note) => note.id)),
    promptDetail: "Adaptive | Treble clef C4-G4",
    rangeControls: <div data-testid="range-controls" />,
    roundAccuracy: "0%",
    roundAttempts: 0,
    roundCorrect: 0,
    shouldRevealPitch: false,
    hasTimeLimit: true,
    timeRemaining: 60,
    onClearMelodyAnswer: vi.fn(),
    onFinishRound: vi.fn(),
    onMelodyNoteInput: vi.fn(),
    onPitchKeyAnswer: vi.fn(),
    onReadingKeyAnswer: vi.fn(),
    onStartReplay: vi.fn(),
    onStartRound: vi.fn(),
    onSubmitMelodyAnswer: vi.fn(),
    onUndoMelodyAnswer: vi.fn(),
    ...overrides,
  };

  return { ...render(<PracticeWorkspace {...props} />), props };
}

describe("PracticeWorkspace", () => {
  it("renders the reading workspace with staff, piano, range controls, and round stats", () => {
    renderWorkspace();

    expect(screen.getByRole("region", { name: "Practice drill" })).toBeInTheDocument();
    expect(screen.getByTestId("range-controls")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
    expect(screen.getByText("Find this note on the piano.")).toBeInTheDocument();
    expect(screen.getByText("Adaptive | Treble clef C4-G4")).toBeInTheDocument();
    expect(screen.getByText("60s")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
  });

  it("renders the single-pitch workspace with an exact piano answer", () => {
    const onPitchKeyAnswer = vi.fn();
    renderWorkspace({ mode: "pitch", isRunning: true, onPitchKeyAnswer });

    expect(screen.getByText("Find the pitch you hear.")).toBeInTheDocument();
    expect(screen.getByTestId("range-controls")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "White piano key C4, inside selected range" }));
    expect(onPitchKeyAnswer).toHaveBeenCalledWith("C4");
  });

  it("shows an open-ended round without a countdown", () => {
    renderWorkspace({ hasTimeLimit: false, timeRemaining: 0 });

    expect(screen.getByText("No limit")).toBeInTheDocument();
    expect(screen.queryByText("0s")).not.toBeInTheDocument();
  });

  it("disables pitch answers while idle or after feedback", () => {
    renderWorkspace({ mode: "pitch", isRunning: false });
    expect(screen.getByRole("button", { name: "White piano key C4, inside selected range" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    renderWorkspace({
      mode: "pitch",
      isRunning: true,
      feedback: { answer: "C", answerId: "C4", isCorrect: true },
    });
    const secondAnswerSet = screen.getByRole("button", {
      name: "White piano key C4, selected correct, target note, inside selected range",
    });
    expect(secondAnswerSet).toHaveAttribute("aria-disabled", "true");
  });

  it("collects a pitch sequence on the staff and submits it", () => {
    const onMelodyNoteInput = vi.fn();
    const onSubmitMelodyAnswer = vi.fn();
    renderWorkspace({
      mode: "pitch",
      pitchExercise: "melody",
      isRunning: true,
      melodyAnswerNoteIds: ["C4", "C#4", "D4"],
      onMelodyNoteInput,
      onSubmitMelodyAnswer,
    });

    expect(screen.getByText("Transcribe the pitch sequence.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Pitch sequence answer, 3 of 3 notes entered/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit sequence" }));
    expect(onSubmitMelodyAnswer).toHaveBeenCalledTimes(1);
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
