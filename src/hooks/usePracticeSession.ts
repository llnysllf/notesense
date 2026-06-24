import { useCallback, useEffect, useRef, useState } from "react";
import { playTone } from "../audio";
import { PITCH_ANSWER_OPTIONS, PITCH_NOTES, getPianoKeyById, getReadingNotes } from "../noteData";
import { createSessionRecord, createSessionSummary, selectPitchNote, selectReadingNote } from "../practiceEngine";
import { completeRound, recordPitchAttempt, recordReadingAttempt, recordReadingLocationAttempt } from "../storage";
import type {
  FeedbackState,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  ReadingNoteName,
  SessionSummary,
  TrainingNote,
} from "../types";

const ADVANCE_DELAY_MS = 650;

interface UsePracticeSessionOptions {
  settings: PracticeSettings;
  progress: PracticeProgress;
  onProgressChange: (next: PracticeProgress) => void;
}

export interface UsePracticeSessionResult {
  mode: PracticeMode;
  setPracticeMode: (nextMode: PracticeMode) => void;
  currentReadingNote: TrainingNote;
  currentPitchNote: PitchNote;
  feedback: FeedbackState;
  timeRemaining: number;
  roundAttempts: number;
  roundCorrect: number;
  currentStreak: number;
  bestRoundStreak: number;
  isRunning: boolean;
  lastSummary: SessionSummary | null;
  startRound: () => void;
  finishRound: () => void;
  handleAnswer: (answer: NoteName) => void;
  handleReadingKeyAnswer: (noteId: string) => void;
  playCurrentNote: () => void;
  setTimeRemaining: (n: number) => void;
  resetSession: (nextSettings: PracticeSettings, nextProgress: PracticeProgress) => void;
}

export function usePracticeSession({
  settings,
  progress,
  onProgressChange,
}: UsePracticeSessionOptions): UsePracticeSessionResult {
  const [mode, setMode] = useState<PracticeMode>("reading");
  const [currentReadingNote, setCurrentReadingNote] = useState<TrainingNote>(() =>
    selectReadingNote({ readingRange: settings.readingRange }),
  );
  const [currentPitchNote, setCurrentPitchNote] = useState<PitchNote>(() => selectPitchNote());
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
    const completedAt = Date.now();
    const durationSeconds = roundStartedAt
      ? Math.max(1, Math.round((completedAt - roundStartedAt) / 1000))
      : Math.max(0, settings.roundLength - timeRemaining);
    const sessionRecord = createSessionRecord({
      id: `${mode}-${completedAt}`,
      mode,
      completedAt: new Date(completedAt).toISOString(),
      durationSeconds,
      score: roundCorrect,
      attempts: roundAttempts,
      bestStreak: bestRoundStreak,
    });
    const nextProgress = completeRound(progress, sessionRecord);
    const summary = createSessionSummary(
      mode,
      nextProgress,
      roundCorrect,
      roundAttempts,
      bestRoundStreak,
      settings.readingRange,
    );
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
    settings.readingRange,
    settings.roundLength,
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

  function getNextReadingNote(previousNoteId?: string, nextProgress = progress): TrainingNote {
    const opts = {
      progress: nextProgress.reading,
      readingRange: settings.readingRange,
      useAdaptive: settings.adaptivePractice,
    };
    return selectReadingNote(previousNoteId === undefined ? opts : { ...opts, previousNoteId });
  }

  function getNextPitchNote(previousNoteId?: string, nextProgress = progress): PitchNote {
    const opts = { progress: nextProgress.pitch, useAdaptive: settings.adaptivePractice };
    return selectPitchNote(previousNoteId === undefined ? opts : { ...opts, previousNoteId });
  }

  function setPracticeMode(nextMode: PracticeMode) {
    clearAdvanceTimer();
    setMode(nextMode);
    setFeedback(null);
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

    const nextPitch = getNextPitchNote(currentPitchNote.id);
    setCurrentPitchNote(nextPitch);
    if (settings.autoPlayPitch) {
      playTone(nextPitch.frequency);
    }
  }

  function playCurrentNote() {
    const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
    playTone(activeNote.frequency);
  }

  function recordAnswer(answer: NoteName, answerId?: string) {
    if (feedback !== null || !isRunning) return;
    const answeredMode = mode;
    const answeredReadingNote = currentReadingNote;
    const answeredPitchNote = currentPitchNote;
    const expectedAnswer = answeredMode === "reading" ? answeredReadingNote.name : answeredPitchNote.name;
    const isExactReadingAnswer = answeredMode === "reading" && answerId !== undefined;
    const isCorrect = isExactReadingAnswer ? answerId === answeredReadingNote.id : answer === expectedAnswer;
    const nextStreak = isCorrect ? currentStreak + 1 : 0;
    const nextBestStreak = Math.max(bestRoundStreak, nextStreak);
    const nextProgress =
      answeredMode === "reading" && answerId !== undefined
        ? recordReadingLocationAttempt(progress, answeredReadingNote, answerId)
        : answeredMode === "reading"
          ? recordReadingAttempt(progress, answeredReadingNote, answer as ReadingNoteName)
          : recordPitchAttempt(progress, answeredPitchNote, answer);

    setFeedback(answerId === undefined ? { answer, isCorrect } : { answer, answerId, isCorrect });
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

  function handleAnswer(answer: NoteName) {
    recordAnswer(answer);
  }

  function handleReadingKeyAnswer(noteId: string) {
    const key = getPianoKeyById(noteId);
    if (!key) return;

    recordAnswer(key.naturalName, key.id);
  }

  function resetSession(nextSettings: PracticeSettings, nextProgress: PracticeProgress) {
    clearAdvanceTimer();
    setCurrentReadingNote(
      selectReadingNote({
        progress: nextProgress.reading,
        readingRange: nextSettings.readingRange,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
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

  // No dependency array so the handler always has current closure values.
  useEffect(() => {
    const shortcutSource = mode === "reading" ? getReadingNotes(settings.readingRange) : PITCH_NOTES;

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toUpperCase() as NoteName;
      const letterOption = PITCH_ANSWER_OPTIONS.find((a) => a === key);
      const shortcutOption = shortcutSource.find((note) => note.keyboardShortcut === event.key);
      if (mode === "pitch" && letterOption !== undefined) {
        handleAnswer(letterOption);
        return;
      }
      if (shortcutOption !== undefined) {
        if (mode === "reading") {
          handleReadingKeyAnswer(shortcutOption.id);
          return;
        }
        handleAnswer(shortcutOption.name as NoteName);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return {
    mode,
    setPracticeMode,
    currentReadingNote,
    currentPitchNote,
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
    handleAnswer,
    handleReadingKeyAnswer,
    playCurrentNote,
    resetSession,
  };
}
