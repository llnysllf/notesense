import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { getPianoKeyById, getReadingNotes } from "../noteData";
import { completeSessionRound } from "./practiceSessionLogic";
import type { PracticeProgress, PracticeSettings, ReadingMiss, SessionSummary, TrainingNote } from "../types";
import { buildReadingTestForm, buildReplaySet, getReadingModeRules, scoreReadingTest } from "../types";

type ReadingTestAnswer = { correct: boolean; responseMs: number };
type ReadingFixedQueueKind = "test" | "replay";

type PromptTimingRef = MutableRefObject<{ wallIso: string; clock: number } | null>;

type ReadingAcademyFlowOptions = {
  settings: PracticeSettings;
  currentReadingNote: TrainingNote;
  getNextReadingNote: (previousId?: string, nextProgress?: PracticeProgress) => TrainingNote;
  setCurrentReadingNote: (value: TrainingNote | ((note: TrainingNote) => TrainingNote)) => void;
  setRoundStartedAt: (value: number | null) => void;
  setIsRunning: (value: boolean) => void;
  setFeedback: (value: null) => void;
  setLastSummary: (value: SessionSummary | null) => void;
  setRoundAttempts: (value: number) => void;
  setRoundCorrect: (value: number) => void;
  setCurrentStreak: (value: number) => void;
  setBestRoundStreak: (value: number) => void;
  setTimeRemaining: (value: number) => void;
  clearAdvanceTimer: () => void;
  promptStartedAtRef: PromptTimingRef;
};

type CompleteReplayOptions = {
  settings: PracticeSettings;
  nextProgress: PracticeProgress;
  roundAttempts: number;
  roundCorrect: number;
  nextBestStreak: number;
  roundStartedAt: number | null;
  timeRemaining: number;
  onProgressChange: (next: PracticeProgress) => void;
};

function buildReadingTestQueue(settings: PracticeSettings): TrainingNote[] {
  const notes = getReadingNotes(settings.readingRange, settings.customReadingRange);
  const noteMidis = notes.flatMap((note) => {
    const midi = getPianoKeyById(note.id)?.midi;
    return midi === undefined ? [] : [midi];
  });
  if (noteMidis.length === 0) return notes;

  const noteByMidi = new Map(notes.map((note) => [getPianoKeyById(note.id)?.midi, note]));
  const form = buildReadingTestForm({
    lowMidi: Math.min(...noteMidis),
    highMidi: Math.max(...noteMidis),
    allowedMidis: noteMidis,
    promptCount: getReadingModeRules(settings.readingMode).fixedPromptCount ?? 20,
    seed: `${settings.readingRange}:${settings.customReadingRange.startNoteId}-${settings.customReadingRange.endNoteId}:v1`,
  });

  return form.prompts.flatMap((midi) => {
    const note = noteByMidi.get(midi);
    return note === undefined ? [] : [note];
  });
}

function buildReadingReplayQueue(settings: PracticeSettings, misses: readonly ReadingMiss[]): TrainingNote[] {
  const notes = getReadingNotes(settings.readingRange, settings.customReadingRange);
  const noteByMidi = new Map(notes.map((note) => [getPianoKeyById(note.id)?.midi, note]));

  return buildReplaySet(misses).flatMap((midi) => {
    const note = noteByMidi.get(midi);
    return note === undefined ? [] : [note];
  });
}

function summarizeReadingTest(answers: readonly ReadingTestAnswer[], completed: boolean): SessionSummary {
  const result = scoreReadingTest(answers);
  const accuracy = Math.round(result.accuracy * 100);
  const median = result.medianResponseMs > 0 ? ` Median response ${result.medianResponseMs}ms.` : "";
  return {
    mode: "reading",
    score: result.correct,
    attempts: result.promptCount,
    accuracy,
    bestStreak: 0,
    suggestion: completed
      ? `Test complete: ${accuracy}% accuracy.${median}`
      : `Test stopped early: ${result.correct}/${result.promptCount} correct.${median}`,
  };
}

function resetRoundCounters(options: ReadingAcademyFlowOptions) {
  options.setRoundStartedAt(Date.now());
  options.setIsRunning(true);
  options.setFeedback(null);
  options.setLastSummary(null);
  options.setRoundAttempts(0);
  options.setRoundCorrect(0);
  options.setCurrentStreak(0);
  options.setBestRoundStreak(0);
  options.setTimeRemaining(options.settings.roundLength);
}

export function useReadingAcademyFlow(options: ReadingAcademyFlowOptions) {
  const [lookAheadReadingNote, setLookAheadReadingNote] = useState<TrainingNote | null>(null);
  const [isReadingPromptHidden, setIsReadingPromptHidden] = useState(false);
  const queueRef = useRef<TrainingNote[]>([]);
  const queueIndexRef = useRef(0);
  const testAnswersRef = useRef<ReadingTestAnswer[]>([]);
  const queueKindRef = useRef<ReadingFixedQueueKind | null>(null);
  const audiationTimerRef = useRef<number | null>(null);
  const promptStartedAtRef = options.promptStartedAtRef;

  const clearAudiationTimer = useCallback(() => {
    if (audiationTimerRef.current !== null) {
      window.clearTimeout(audiationTimerRef.current);
      audiationTimerRef.current = null;
    }
  }, []);

  const scheduleAudiationHide = useCallback(() => {
    clearAudiationTimer();
    setIsReadingPromptHidden(false);
    audiationTimerRef.current = window.setTimeout(() => {
      audiationTimerRef.current = null;
      setIsReadingPromptHidden(true);
    }, 1200);
  }, [clearAudiationTimer]);

  const reset = useCallback(() => {
    clearAudiationTimer();
    queueRef.current = [];
    queueIndexRef.current = 0;
    testAnswersRef.current = [];
    queueKindRef.current = null;
    setLookAheadReadingNote(null);
    setIsReadingPromptHidden(false);
  }, [clearAudiationTimer]);

  useEffect(() => reset, [reset]);

  function finishTestRound(): boolean {
    if (queueKindRef.current !== "test") return false;
    options.clearAdvanceTimer();
    clearAudiationTimer();
    options.setLastSummary(summarizeReadingTest(testAnswersRef.current, false));
    options.setIsRunning(false);
    options.setRoundStartedAt(null);
    options.setFeedback(null);
    options.setTimeRemaining(options.settings.roundLength);
    reset();
    return true;
  }

  function startModeRound(): boolean {
    reset();
    if (options.settings.readingMode === "test") {
      const queue = buildReadingTestQueue(options.settings);
      queueRef.current = queue;
      queueKindRef.current = "test";
      resetRoundCounters(options);
      if (queue[0] !== undefined) options.setCurrentReadingNote(queue[0]);
      scheduleAudiationHide();
      return true;
    }

    if (options.settings.readingMode !== "learn") return false;

    const first = options.getNextReadingNote(options.currentReadingNote.id);
    const next = options.getNextReadingNote(first.id);
    resetRoundCounters(options);
    options.setCurrentReadingNote(first);
    setLookAheadReadingNote(next);
    return true;
  }

  function startReplay(misses: readonly ReadingMiss[]): boolean {
    const queue = buildReadingReplayQueue(options.settings, misses);
    if (queue.length === 0) return false;

    reset();
    queueRef.current = queue;
    queueKindRef.current = "replay";
    resetRoundCounters(options);
    options.setCurrentReadingNote(queue[0]!);
    return true;
  }

  function recordTestAnswer(isCorrect: boolean, promptClock: number | undefined) {
    if (queueKindRef.current !== "test") return false;
    const now = performance.now();
    testAnswersRef.current.push({
      correct: isCorrect,
      responseMs: Math.max(0, Math.round(now - (promptClock ?? now))),
    });
    return true;
  }

  function completeReplayRound({
    settings,
    nextProgress,
    roundAttempts,
    roundCorrect,
    nextBestStreak,
    roundStartedAt,
    timeRemaining,
    onProgressChange,
  }: CompleteReplayOptions) {
    const { nextProgress: completedProgress, summary } = completeSessionRound({
      mode: "reading",
      settings,
      progress: nextProgress,
      roundAttempts,
      roundCorrect,
      bestRoundStreak: nextBestStreak,
      roundStartedAt,
      timeRemaining,
    });
    onProgressChange(completedProgress);
    options.setLastSummary(summary);
    options.setIsRunning(false);
    options.setRoundStartedAt(null);
    options.setTimeRemaining(settings.roundLength);
    reset();
  }

  function advanceAfterReadingAnswer(params: {
    answeredReadingNote: TrainingNote;
    isCorrect: boolean;
    nextProgress: PracticeProgress;
    roundAttempts: number;
    roundCorrect: number;
    nextBestStreak: number;
    roundStartedAt: number | null;
    timeRemaining: number;
    onProgressChange: (next: PracticeProgress) => void;
  }): boolean {
    if (queueKindRef.current === "test") {
      const nextIndex = queueIndexRef.current + 1;
      const nextTestNote = queueRef.current[nextIndex];
      if (nextTestNote === undefined) {
        options.setLastSummary(summarizeReadingTest(testAnswersRef.current, true));
        options.setIsRunning(false);
        options.setRoundStartedAt(null);
        options.setTimeRemaining(options.settings.roundLength);
        reset();
        return true;
      }
      queueIndexRef.current = nextIndex;
      promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      options.setCurrentReadingNote(nextTestNote);
      scheduleAudiationHide();
      return true;
    }

    if (queueKindRef.current === "replay") {
      if (!params.isCorrect) {
        promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
        return true;
      }

      const nextIndex = queueIndexRef.current + 1;
      const nextReplayNote = queueRef.current[nextIndex];
      if (nextReplayNote === undefined) {
        completeReplayRound({
          settings: options.settings,
          nextProgress: params.nextProgress,
          roundAttempts: params.roundAttempts + 1,
          roundCorrect: params.roundCorrect + 1,
          nextBestStreak: params.nextBestStreak,
          roundStartedAt: params.roundStartedAt,
          timeRemaining: params.timeRemaining,
          onProgressChange: params.onProgressChange,
        });
        return true;
      }
      queueIndexRef.current = nextIndex;
      promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      options.setCurrentReadingNote(nextReplayNote);
      return true;
    }

    if (options.settings.readingMode !== "learn") return false;

    const nextReadingNote =
      lookAheadReadingNote ?? options.getNextReadingNote(params.answeredReadingNote.id, params.nextProgress);
    options.setCurrentReadingNote(nextReadingNote);
    setLookAheadReadingNote(options.getNextReadingNote(nextReadingNote.id, params.nextProgress));
    return true;
  }

  return {
    lookAheadReadingNote,
    isReadingPromptHidden,
    queueKindRef,
    clearAudiationTimer,
    finishTestRound,
    startModeRound,
    startReplay,
    recordTestAnswer,
    advanceAfterReadingAnswer,
    reset,
  };
}

export type ReadingAcademyFlow = ReturnType<typeof useReadingAcademyFlow>;
