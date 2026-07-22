import { useCallback, useEffect, useRef, useState } from "react";
import { playMelody, playTone } from "../audio";
import { getPianoKeyById, getPitchNotes } from "../noteData";
import { ADVANCE_DELAY_MS, MELODY_ADVANCE_DELAY_MS } from "./practiceSessionConstants";
import { completeSessionRound, evaluateMelodyAnswer, evaluateSingleAnswer } from "./practiceSessionLogic";
import { usePracticeItems } from "./usePracticeItems";
import { useReadingShortcuts } from "./useReadingShortcuts";
import type { UsePracticeSessionOptions, UsePracticeSessionResult } from "./practiceSessionTypes";
import type {
  FeedbackState,
  NoteName,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
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

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearAdvanceTimer(), [clearAdvanceTimer]);

  const finishRound = useCallback(() => {
    if (!isRunning) return;
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
  }, [
    bestRoundStreak,
    clearAdvanceTimer,
    isRunning,
    mode,
    onProgressChange,
    progress,
    roundAttempts,
    roundCorrect,
    roundStartedAt,
    settings,
    timeRemaining,
  ]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeRemaining <= 0) {
      const t = window.setTimeout(finishRound, 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setTimeRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [finishRound, isRunning, timeRemaining]);

  function setPracticeMode(nextMode: PracticeMode) {
    clearAdvanceTimer();
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
    setRoundStartedAt(Date.now());
    setIsRunning(true);
    setFeedback(null);
    setLastSummary(null);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setTimeRemaining(settings.roundLength);

    if (mode === "reading") {
      setCurrentReadingNote((note) => getNextReadingNote(note.id));
      return;
    }

    if (settings.pitchExercise === "melody") {
      const nextMelody = getNextPitchMelody(currentMelody.at(-1)?.id);
      setCurrentMelody(nextMelody);
      setMelodyAnswerNoteIds([]);
      if (settings.autoPlayPitch) playMelody(nextMelody.map((note) => note.frequency));
      return;
    }

    const nextPitch = getNextPitchNote(currentPitchNote.id);
    setCurrentPitchNote(nextPitch);
    if (settings.autoPlayPitch) playTone(nextPitch.frequency);
  }

  function playCurrentNote() {
    if (mode === "pitch" && settings.pitchExercise === "melody") {
      playMelody(currentMelody.map((note) => note.frequency));
      return;
    }

    playTone(mode === "reading" ? currentReadingNote.frequency : currentPitchNote.frequency);
  }

  function recordAnswer(answer: NoteName, answerId?: string) {
    if (feedback !== null || !isRunning) return;
    const answeredMode = mode;
    const answeredReadingNote = currentReadingNote;
    const answeredPitchNote = currentPitchNote;
    const {
      feedback: nextFeedback,
      isCorrect,
      nextBestStreak,
      nextProgress,
      nextStreak,
    } = evaluateSingleAnswer({
      answer,
      answerId,
      mode: answeredMode,
      readingNote: answeredReadingNote,
      pitchNote: answeredPitchNote,
      currentStreak,
      bestRoundStreak,
      progress,
    });

    setFeedback(nextFeedback);
    setRoundAttempts((n) => n + 1);
    setRoundCorrect((n) => n + (isCorrect ? 1 : 0));
    setCurrentStreak(nextStreak);
    setBestRoundStreak(nextBestStreak);
    onProgressChange(nextProgress);

    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      setFeedback(null);
      if (answeredMode === "reading") {
        setCurrentReadingNote((note) => getNextReadingNote(note.id, nextProgress));
        return;
      }
      const nextPitch = getNextPitchNote(answeredPitchNote.id, nextProgress);
      setCurrentPitchNote(nextPitch);
      if (settings.autoPlayPitch) {
        playTone(nextPitch.frequency);
      }
    }, ADVANCE_DELAY_MS);
  }

  function handleReadingKeyAnswer(noteId: string) {
    const key = getPianoKeyById(noteId);
    if (!key) return;

    recordAnswer(key.naturalName, key.id);
  }

  function handlePitchKeyAnswer(noteId: string) {
    const key = getPianoKeyById(noteId);
    if (!key) return;

    recordAnswer(key.naturalName, key.id);
  }

  function handleMelodyNoteInput(noteId: string) {
    if (mode !== "pitch" || settings.pitchExercise !== "melody" || !isRunning || feedback !== null) return;
    if (melodyAnswerNoteIds.length >= currentMelody.length) return;
    if (!getPitchNotes(settings.pitchRange, settings.customPitchRange).some((note) => note.id === noteId)) return;

    setMelodyAnswerNoteIds((answer) => [...answer, noteId]);
  }

  function undoMelodyAnswer() {
    if (feedback !== null) return;
    setMelodyAnswerNoteIds((answer) => answer.slice(0, -1));
  }

  function clearMelodyAnswer() {
    if (feedback !== null) return;
    setMelodyAnswerNoteIds([]);
  }

  function submitMelodyAnswer() {
    if (
      mode !== "pitch" ||
      settings.pitchExercise !== "melody" ||
      !isRunning ||
      feedback !== null ||
      melodyAnswerNoteIds.length !== currentMelody.length
    ) {
      return;
    }

    const {
      correctCount,
      feedback: nextFeedback,
      nextProgress,
      streakResult,
    } = evaluateMelodyAnswer({
      progress,
      melody: currentMelody,
      answerNoteIds: melodyAnswerNoteIds,
      currentStreak,
      bestRoundStreak,
    });
    setFeedback(nextFeedback);
    setRoundAttempts((attempts) => attempts + currentMelody.length);
    setRoundCorrect((correct) => correct + correctCount);
    setCurrentStreak(streakResult.streak);
    setBestRoundStreak(streakResult.best);
    onProgressChange(nextProgress);

    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      const nextMelody = getNextPitchMelody(currentMelody.at(-1)?.id, nextProgress);
      setCurrentMelody(nextMelody);
      setMelodyAnswerNoteIds([]);
      setFeedback(null);
      if (settings.autoPlayPitch) playMelody(nextMelody.map((note) => note.frequency));
    }, MELODY_ADVANCE_DELAY_MS);
  }

  function resetSession(nextSettings: PracticeSettings, nextProgress: PracticeProgress) {
    clearAdvanceTimer();
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

  useReadingShortcuts({ mode, settings, onAnswer: handleReadingKeyAnswer });

  return {
    mode,
    setPracticeMode,
    currentReadingNote,
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
    finishRound,
    handleAnswer: (answer) => recordAnswer(answer),
    handleReadingKeyAnswer,
    handlePitchKeyAnswer,
    handleMelodyNoteInput,
    undoMelodyAnswer,
    clearMelodyAnswer,
    submitMelodyAnswer,
    playCurrentNote,
    resetSession,
  };
}
