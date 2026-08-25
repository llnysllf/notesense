import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playMelody, playTone } from "../audio";
import { emptyProgress } from "../noteData";
import { defaultSettings } from "../storage";
import type { PracticeProgress, PracticeSettings } from "../types";
import { usePracticeSession } from "./usePracticeSession";

const { captureSingleEvidenceAttempt } = vi.hoisted(() => ({ captureSingleEvidenceAttempt: vi.fn() }));

vi.mock("./evidenceCapture", () => ({
  captureSingleEvidenceAttempt,
  captureMelodyEvidenceAttempts: vi.fn(),
}));

vi.mock("../audio", () => ({
  playMelody: vi.fn(),
  playTone: vi.fn(),
}));

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

function renderPracticeSession(
  options: Partial<{
    settings: PracticeSettings;
    progress: PracticeProgress;
    onProgressChange: (next: PracticeProgress) => void;
  }> = {},
) {
  const onProgressChange = vi.fn((next: PracticeProgress) => {
    options.onProgressChange?.(next);
  });
  const settings = options.settings ?? defaultSettings;
  const progress = options.progress ?? freshProgress();

  return {
    onProgressChange,
    ...renderHook(
      ({ currentProgress, currentSettings }) =>
        usePracticeSession({
          settings: currentSettings,
          progress: currentProgress,
          onProgressChange,
        }),
      {
        initialProps: {
          currentProgress: progress,
          currentSettings: settings,
        },
      },
    ),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-18T01:00:00.000Z"));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("usePracticeSession", () => {
  it("starts a reading round with clean counters", () => {
    const { result } = renderPracticeSession({
      settings: { ...defaultSettings, roundLength: 30 },
    });

    act(() => result.current.startRound());

    expect(result.current.isRunning).toBe(true);
    expect(result.current.feedback).toBeNull();
    expect(result.current.lastSummary).toBeNull();
    expect(result.current.roundAttempts).toBe(0);
    expect(result.current.roundCorrect).toBe(0);
    expect(result.current.timeRemaining).toBe(30);
  });

  it("records a correct reading answer and blocks duplicate answers during feedback", () => {
    const { result, onProgressChange } = renderPracticeSession();

    act(() => result.current.startRound());
    const answer = result.current.currentReadingNote.name;
    act(() => result.current.handleAnswer(answer));
    act(() => result.current.handleAnswer(answer));

    const nextProgress = onProgressChange.mock.calls[0]?.[0] as PracticeProgress;
    expect(onProgressChange).toHaveBeenCalledTimes(1);
    expect(result.current.feedback).toEqual({ answer, isCorrect: true });
    expect(result.current.roundAttempts).toBe(1);
    expect(result.current.roundCorrect).toBe(1);
    expect(nextProgress.reading.totalAttempts).toBe(1);
    expect(nextProgress.reading.totalCorrect).toBe(1);

    act(() => vi.advanceTimersByTime(650));

    expect(result.current.feedback).toBeNull();
  });

  it("keeps Test-mode reading attempts out of shared evidence", () => {
    const { result, onProgressChange } = renderPracticeSession({
      settings: { ...defaultSettings, readingMode: "test" },
    });

    act(() => result.current.startRound());
    act(() => result.current.handleAnswer(result.current.currentReadingNote.name));

    expect(onProgressChange).not.toHaveBeenCalled();
    expect(captureSingleEvidenceAttempt).not.toHaveBeenCalled();
  });

  it("runs Test mode as a fixed twenty-prompt form with a local score", () => {
    const { result, onProgressChange } = renderPracticeSession({
      settings: { ...defaultSettings, readingMode: "test" },
    });

    act(() => result.current.startRound());
    const promptIds: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      promptIds.push(result.current.currentReadingNote.id);
      act(() => result.current.handleAnswer(result.current.currentReadingNote.name));
      act(() => vi.advanceTimersByTime(650));
    }

    expect(promptIds).toHaveLength(20);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.lastSummary).toMatchObject({
      mode: "reading",
      score: 20,
      attempts: 20,
      accuracy: 100,
    });
    expect(onProgressChange).not.toHaveBeenCalled();
  });

  it("keeps a stable look-ahead note in Learn mode", () => {
    const { result } = renderPracticeSession({
      settings: { ...defaultSettings, readingMode: "learn" },
    });

    act(() => result.current.startRound());

    expect(result.current.lookAheadReadingNote).not.toBeNull();
    expect(result.current.lookAheadReadingNote?.id).not.toBe(result.current.currentReadingNote.id);
  });

  it("replays missed reading notes until they are recovered", () => {
    const { result, onProgressChange } = renderPracticeSession();
    const misses = [{ expectedMidi: 60, answeredMidi: 62, code: "step-slip" as const }];

    act(() => result.current.startReplay(misses));
    expect(result.current.isRunning).toBe(true);
    expect(result.current.currentReadingNote.id).toBe("C4");

    act(() => result.current.handleReadingKeyAnswer("D4"));
    act(() => vi.advanceTimersByTime(650));

    expect(result.current.isRunning).toBe(true);
    expect(result.current.currentReadingNote.id).toBe("C4");

    act(() => result.current.handleReadingKeyAnswer("C4"));
    act(() => vi.advanceTimersByTime(650));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.lastSummary).toMatchObject({ mode: "reading", score: 1, attempts: 2, accuracy: 50 });
    expect(onProgressChange).toHaveBeenCalled();
  });

  it("ignores answers before a round starts", () => {
    const { result, onProgressChange } = renderPracticeSession();

    act(() => result.current.handleAnswer(result.current.currentReadingNote.name));

    expect(onProgressChange).not.toHaveBeenCalled();
    expect(result.current.roundAttempts).toBe(0);
    expect(result.current.feedback).toBeNull();
  });

  it("ignores finish requests before a round starts", () => {
    const { result, onProgressChange } = renderPracticeSession();

    act(() => result.current.finishRound());

    expect(onProgressChange).not.toHaveBeenCalled();
    expect(result.current.lastSummary).toBeNull();
  });

  it("plays the current reading and pitch notes on demand", () => {
    const playToneMock = vi.mocked(playTone);
    const { result } = renderPracticeSession();

    act(() => result.current.playCurrentNote());
    expect(playToneMock).toHaveBeenLastCalledWith(result.current.currentReadingNote.frequency);

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.playCurrentNote());
    expect(playToneMock).toHaveBeenLastCalledWith(result.current.currentPitchNote.frequency);
  });

  it("replays the complete melody on demand", () => {
    const playMelodyMock = vi.mocked(playMelody);
    const { result } = renderPracticeSession({
      settings: { ...defaultSettings, pitchExercise: "melody" },
    });

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.playCurrentNote());

    expect(playMelodyMock).toHaveBeenCalledWith(result.current.currentMelody.map((note) => note.frequency));
  });

  it("switches modes and auto-plays pitch rounds when configured", () => {
    const playToneMock = vi.mocked(playTone);
    const { result } = renderPracticeSession({
      settings: { ...defaultSettings, autoPlayPitch: true },
    });

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.startRound());

    expect(result.current.mode).toBe("pitch");
    expect(result.current.isRunning).toBe(true);
    expect(playToneMock).toHaveBeenCalledWith(result.current.currentPitchNote.frequency);
  });

  it("records an incorrect pitch answer and advances to the next pitch prompt", () => {
    const { result, onProgressChange } = renderPracticeSession();

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.startRound());
    const wrongAnswer = (["C", "D", "E", "F", "G", "A", "B"] as const).find(
      (answer) => answer !== result.current.currentPitchNote.name,
    );
    if (wrongAnswer === undefined) {
      throw new Error("Missing wrong pitch-answer fixture.");
    }
    act(() => result.current.handleAnswer(wrongAnswer));

    const nextProgress = onProgressChange.mock.calls[0]?.[0] as PracticeProgress;
    expect(result.current.feedback).toEqual({ answer: wrongAnswer, isCorrect: false });
    expect(result.current.currentStreak).toBe(0);
    expect(nextProgress.pitch.totalAttempts).toBe(1);
    expect(nextProgress.pitch.totalCorrect).toBe(0);

    act(() => vi.advanceTimersByTime(650));

    expect(result.current.feedback).toBeNull();
  });

  it("records exact single-pitch piano answers", () => {
    const { result, onProgressChange } = renderPracticeSession();

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.startRound());
    const answerNoteId = result.current.currentPitchNote.id;
    act(() => result.current.handlePitchKeyAnswer(answerNoteId));

    const nextProgress = onProgressChange.mock.calls[0]?.[0] as PracticeProgress;
    expect(result.current.feedback).toMatchObject({ answerId: answerNoteId, isCorrect: true });
    expect(nextProgress.pitch.noteStats[answerNoteId]).toEqual({ attempts: 1, correct: 1 });
  });

  it("plays, collects, and scores a melody as note-level attempts", () => {
    const playMelodyMock = vi.mocked(playMelody);
    const { result, onProgressChange } = renderPracticeSession({
      settings: { ...defaultSettings, pitchExercise: "melody", melodyLength: 3 },
    });

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.startRound());
    const melody = result.current.currentMelody.map((note) => note.id);
    melody.forEach((noteId) => act(() => result.current.handleMelodyNoteInput(noteId)));
    act(() => result.current.submitMelodyAnswer());

    const nextProgress = onProgressChange.mock.calls[0]?.[0] as PracticeProgress;
    expect(playMelodyMock).toHaveBeenCalledWith(result.current.currentMelody.map((note) => note.frequency));
    expect(result.current.feedback).toMatchObject({ answerId: melody.join(" "), isCorrect: true });
    expect(result.current.roundAttempts).toBe(3);
    expect(result.current.roundCorrect).toBe(3);
    expect(nextProgress.pitch.totalAttempts).toBe(3);
    expect(nextProgress.pitch.totalCorrect).toBe(3);

    act(() => vi.advanceTimersByTime(1400));
    expect(result.current.feedback).toBeNull();
    expect(result.current.melodyAnswerNoteIds).toEqual([]);
    expect(playMelodyMock).toHaveBeenCalledTimes(2);
  });

  it("edits melody answers and ignores unavailable notes", () => {
    const { result, onProgressChange } = renderPracticeSession({
      settings: { ...defaultSettings, pitchExercise: "melody", pitchRange: "natural" },
    });

    act(() => result.current.setPracticeMode("pitch"));
    act(() => result.current.startRound());
    act(() => result.current.submitMelodyAnswer());
    expect(onProgressChange).not.toHaveBeenCalled();

    act(() => result.current.handleMelodyNoteInput("C#4"));
    expect(result.current.melodyAnswerNoteIds).toEqual([]);

    act(() => result.current.handleMelodyNoteInput("C4"));
    act(() => result.current.handleMelodyNoteInput("D4"));
    act(() => result.current.undoMelodyAnswer());
    expect(result.current.melodyAnswerNoteIds).toEqual(["C4"]);

    act(() => result.current.clearMelodyAnswer());
    expect(result.current.melodyAnswerNoteIds).toEqual([]);
  });

  it("submits keyboard shortcut answers while a round is running", () => {
    const { result, onProgressChange } = renderPracticeSession();

    act(() => result.current.startRound());
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: result.current.currentReadingNote.keyboardShortcut })),
    );

    expect(onProgressChange).toHaveBeenCalledTimes(1);
    expect(result.current.roundAttempts).toBe(1);
  });

  it("auto-finishes when the timer reaches zero", () => {
    const { result, onProgressChange } = renderPracticeSession({
      settings: { ...defaultSettings, roundLength: 30 },
    });

    act(() => result.current.startRound());
    act(() => result.current.setTimeRemaining(0));
    act(() => vi.runOnlyPendingTimers());

    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeRemaining).toBe(30);
    expect(result.current.lastSummary).toMatchObject({
      attempts: 0,
      score: 0,
    });
    expect(onProgressChange).toHaveBeenCalledTimes(1);
  });

  it("keeps an open-ended round running until the learner finishes it", () => {
    const progressAfterFinish = { current: freshProgress() };
    const { result, onProgressChange } = renderPracticeSession({
      settings: { ...defaultSettings, roundLength: 0 },
      onProgressChange: (next) => {
        progressAfterFinish.current = next;
      },
    });

    act(() => result.current.startRound());
    act(() => vi.advanceTimersByTime(120_000));

    expect(result.current.isRunning).toBe(true);
    expect(result.current.timeRemaining).toBe(0);
    expect(onProgressChange).not.toHaveBeenCalled();

    act(() => result.current.finishRound());

    expect(result.current.isRunning).toBe(false);
    expect(onProgressChange).toHaveBeenCalledTimes(1);
    expect(progressAfterFinish.current.history[0]?.durationSeconds).toBe(120);
  });

  it("finishes a round with a session record and summary", () => {
    const progressAfterAttempt = { current: freshProgress() };
    const onProgressChange = vi.fn((next: PracticeProgress) => {
      progressAfterAttempt.current = next;
    });
    const { result, rerender } = renderPracticeSession({
      settings: { ...defaultSettings, roundLength: 60 },
      progress: progressAfterAttempt.current,
      onProgressChange,
    });

    act(() => result.current.startRound());
    act(() => result.current.handleAnswer(result.current.currentReadingNote.name));
    rerender({
      currentProgress: progressAfterAttempt.current,
      currentSettings: { ...defaultSettings, roundLength: 60 },
    });
    vi.setSystemTime(new Date("2026-06-18T01:00:10.000Z"));
    act(() => result.current.finishRound());

    const completedProgress = onProgressChange.mock.calls.at(-1)?.[0] as PracticeProgress;
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.lastSummary).toMatchObject({
      mode: "reading",
      score: 1,
      attempts: 1,
      bestStreak: 1,
    });
    expect(completedProgress.history[0]).toMatchObject({
      mode: "reading",
      durationSeconds: 10,
      score: 1,
      attempts: 1,
      bestStreak: 1,
    });
  });

  it("resets session state from imported settings and progress", () => {
    const { result } = renderPracticeSession();
    const nextProgress = freshProgress();
    nextProgress.reading.noteStats.C3 = { attempts: 4, correct: 1 };

    act(() => result.current.startRound());
    act(() =>
      result.current.resetSession({ ...defaultSettings, readingRange: "bass-starter", roundLength: 90 }, nextProgress),
    );

    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeRemaining).toBe(90);
    expect(result.current.roundAttempts).toBe(0);
    expect(result.current.currentReadingNote.clef).toBe("bass");
  });
});
