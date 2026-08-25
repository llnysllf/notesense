import { useCallback, useEffect, useRef, useState } from "react";
import { startPracticeRound } from "./practiceSessionActions";
import { completeSessionRound } from "./practiceSessionLogic";
import { usePracticeItems } from "./usePracticeItems";
import { useMelodyAnswerControls } from "./useMelodyAnswerControls";
import { useReadingAcademyFlow } from "./useReadingAcademyFlow";
import { useReadingShortcuts } from "./useReadingShortcuts";
import { useSingleAnswerControls } from "./useSingleAnswerControls";
import type { UsePracticeSessionOptions, UsePracticeSessionResult } from "./practiceSessionTypes";
import type {
  FeedbackState,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  ReadingMiss,
  SessionSummary,
} from "../types";

export function usePracticeSession({
  settings,
  progress,
  onProgressChange,
}: UsePracticeSessionOptions): UsePracticeSessionResult {
  const [mode, setMode] = useState<PracticeMode>("reading");
  const {
    currentMelody,
    currentPitchNote,
    currentReadingNote,
    melodyAnswerNoteIds,
    getNextPitchMelody,
    getNextPitchNote,
    getNextReadingNote,
    resetItems,
    setCurrentMelody,
    setCurrentPitchNote,
    setCurrentReadingNote,
    setMelodyAnswerNoteIds,
  } = usePracticeItems({ progress, settings });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(settings.roundLength);
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestRoundStreak, setBestRoundStreak] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const promptStartedAtRef = useRef<{ wallIso: string; clock: number } | null>(null);
  const sessionIdRef = useRef<string>("");
  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);
  const readingAcademy = useReadingAcademyFlow({
    settings,
    currentReadingNote,
    getNextReadingNote,
    setCurrentReadingNote,
    setRoundStartedAt,
    setIsRunning,
    setFeedback,
    setLastSummary,
    setRoundAttempts,
    setRoundCorrect,
    setCurrentStreak,
    setBestRoundStreak,
    setTimeRemaining,
    clearAdvanceTimer,
    promptStartedAtRef,
  });
  const melodyControls = useMelodyAnswerControls({
    mode,
    settings,
    progress,
    currentMelody,
    melodyAnswerNoteIds,
    currentStreak,
    bestRoundStreak,
    isRunning,
    feedback,
    promptStartedAtRef,
    sessionIdRef,
    advanceTimerRef,
    setFeedback,
    setRoundAttempts,
    setRoundCorrect,
    setCurrentStreak,
    setBestRoundStreak,
    setCurrentMelody,
    setMelodyAnswerNoteIds,
    onProgressChange,
    clearAdvanceTimer,
    getNextPitchMelody,
  });
  const singleAnswerControls = useSingleAnswerControls({
    mode,
    settings,
    progress,
    currentMelody,
    currentReadingNote,
    currentPitchNote,
    feedback,
    isRunning,
    currentStreak,
    bestRoundStreak,
    roundAttempts,
    roundCorrect,
    roundStartedAt,
    timeRemaining,
    readingAcademy,
    getNextReadingNote,
    getNextPitchNote,
    setFeedback,
    setRoundAttempts,
    setRoundCorrect,
    setCurrentStreak,
    setBestRoundStreak,
    setCurrentReadingNote,
    setCurrentPitchNote,
    onProgressChange,
    clearAdvanceTimer,
    advanceTimerRef,
    promptStartedAtRef,
    sessionIdRef,
  });
  useEffect(() => () => clearAdvanceTimer(), [clearAdvanceTimer]);
  const finishRound = useCallback(() => {
    if (!isRunning) return;
    if (mode === "reading" && readingAcademy.finishTestRound()) return;
    clearAdvanceTimer();
    const { nextProgress, summary } = completeSessionRound({
      mode,
      settings,
      progress,
      roundAttempts,
      roundCorrect,
      bestRoundStreak,
      roundStartedAt,
      timeRemaining,
    });
    onProgressChange(nextProgress);
    setLastSummary(summary);
    setIsRunning(false);
    setRoundStartedAt(null);
    setFeedback(null);
    setTimeRemaining(settings.roundLength);
    readingAcademy.reset();
  }, [
    bestRoundStreak,
    clearAdvanceTimer,
    isRunning,
    mode,
    onProgressChange,
    progress,
    readingAcademy,
    roundAttempts,
    roundCorrect,
    roundStartedAt,
    settings,
    timeRemaining,
  ]);
  useEffect(() => {
    if (!isRunning) return;
    if (settings.roundLength === 0) return;
    if (timeRemaining <= 0) {
      const t = window.setTimeout(finishRound, 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setTimeRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [finishRound, isRunning, settings.roundLength, timeRemaining]);
  function setPracticeMode(nextMode: PracticeMode) {
    clearAdvanceTimer();
    readingAcademy.reset();
    setMode(nextMode);
    setFeedback(null);
    setMelodyAnswerNoteIds([]);
    setLastSummary(null);
    setIsRunning(false);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setRoundStartedAt(null);
    setTimeRemaining(settings.roundLength);
  }
  function startRound() {
    clearAdvanceTimer();
    sessionIdRef.current = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
    promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
    if (mode === "reading" && readingAcademy.startModeRound()) return;
    readingAcademy.reset();
    startPracticeRound({
      mode,
      settings,
      currentMelody,
      currentPitchNote,
      setRoundStartedAt,
      setIsRunning,
      setFeedback,
      setLastSummary,
      setRoundAttempts,
      setRoundCorrect,
      setCurrentStreak,
      setBestRoundStreak,
      setTimeRemaining,
      getNextReadingNote,
      getNextPitchMelody,
      getNextPitchNote,
      setCurrentReadingNote,
      setCurrentMelody,
      setCurrentPitchNote,
      setMelodyAnswerNoteIds,
    });
  }

  function startReplay(misses: readonly ReadingMiss[]) {
    clearAdvanceTimer();
    sessionIdRef.current = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
    promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
    if (mode !== "reading" || !readingAcademy.startReplay(misses)) startRound();
  }

  function resetSession(nextSettings: PracticeSettings, nextProgress: PracticeProgress) {
    clearAdvanceTimer();
    readingAcademy.reset();
    resetItems(nextSettings, nextProgress);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setFeedback(null);
    setLastSummary(null);
    setIsRunning(false);
    setRoundStartedAt(null);
    setTimeRemaining(nextSettings.roundLength);
  }

  useReadingShortcuts({ mode, settings, onAnswer: singleAnswerControls.handleReadingKeyAnswer });

  return {
    mode,
    setPracticeMode,
    currentReadingNote,
    lookAheadReadingNote: readingAcademy.lookAheadReadingNote,
    currentPitchNote,
    currentMelody,
    melodyAnswerNoteIds,
    feedback,
    timeRemaining,
    setTimeRemaining,
    roundAttempts,
    roundCorrect,
    currentStreak,
    bestRoundStreak,
    isRunning,
    lastSummary,
    startRound,
    startReplay,
    finishRound,
    handleAnswer: (answer) => singleAnswerControls.recordAnswer(answer),
    handleReadingKeyAnswer: singleAnswerControls.handleReadingKeyAnswer,
    handlePitchKeyAnswer: singleAnswerControls.handlePitchKeyAnswer,
    handleMelodyNoteInput: melodyControls.handleMelodyNoteInput,
    undoMelodyAnswer: melodyControls.undoMelodyAnswer,
    clearMelodyAnswer: melodyControls.clearMelodyAnswer,
    submitMelodyAnswer: melodyControls.submitMelodyAnswer,
    playCurrentNote: singleAnswerControls.playCurrentNote,
    resetSession,
  };
}
