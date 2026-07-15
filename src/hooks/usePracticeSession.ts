import { useCallback, useEffect, useRef, useState } from "react";
import { playMelody, playTone } from "../audio";
import { getPianoKeyById, getPitchNotes, getReadingNotes } from "../noteData";
import {
  createSessionRecord,
  createSessionSummary,
  selectPitchMelody,
  selectPitchNote,
  selectReadingNote,
} from "../practiceEngine";
import {
  completeRound,
  recordPitchAttempt,
  recordPitchLocationAttempt,
  recordPitchSequenceAttempt,
  recordReadingAttempt,
  recordReadingLocationAttempt,
} from "../storage";
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
const MELODY_ADVANCE_DELAY_MS = 1400;

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
  currentMelody: PitchNote[];
  melodyAnswerNoteIds: string[];
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
  handlePitchKeyAnswer: (noteId: string) => void;
  handleMelodyNoteInput: (noteId: string) => void;
  undoMelodyAnswer: () => void;
  clearMelodyAnswer: () => void;
  submitMelodyAnswer: () => void;
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
    selectReadingNote({ customReadingRange: settings.customReadingRange, readingRange: settings.readingRange }),
  );
  const [currentPitchNote, setCurrentPitchNote] = useState<PitchNote>(() =>
    selectPitchNote({ customPitchRange: settings.customPitchRange, pitchRange: settings.pitchRange }),
  );
  const [currentMelody, setCurrentMelody] = useState<PitchNote[]>(() =>
    selectPitchMelody({
      customPitchRange: settings.customPitchRange,
      length: settings.melodyLength,
      pitchRange: settings.pitchRange,
    }),
  );
  const [melodyAnswerNoteIds, setMelodyAnswerNoteIds] = useState<string[]>([]);
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
      settings.customReadingRange,
      settings.pitchRange,
      settings.customPitchRange,
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
    settings.customReadingRange,
    settings.customPitchRange,
    settings.pitchRange,
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
      customReadingRange: settings.customReadingRange,
      progress: nextProgress.reading,
      readingRange: settings.readingRange,
      useAdaptive: settings.adaptivePractice,
    };
    return selectReadingNote(previousNoteId === undefined ? opts : { ...opts, previousNoteId });
  }

  function getNextPitchNote(previousNoteId?: string, nextProgress = progress): PitchNote {
    const opts = {
      customPitchRange: settings.customPitchRange,
      pitchRange: settings.pitchRange,
      progress: nextProgress.pitch,
      useAdaptive: settings.adaptivePractice,
    };
    return selectPitchNote(previousNoteId === undefined ? opts : { ...opts, previousNoteId });
  }

  function getNextPitchMelody(previousNoteId?: string, nextProgress = progress): PitchNote[] {
    const opts = {
      customPitchRange: settings.customPitchRange,
      length: settings.melodyLength,
      pitchRange: settings.pitchRange,
      progress: nextProgress.pitch,
      useAdaptive: settings.adaptivePractice,
    };
    return selectPitchMelody(previousNoteId === undefined ? opts : { ...opts, previousNoteId });
  }

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
    const expectedAnswer = answeredMode === "reading" ? answeredReadingNote.name : answeredPitchNote.name;
    const isExactAnswer = answerId !== undefined;
    const expectedAnswerId = answeredMode === "reading" ? answeredReadingNote.id : answeredPitchNote.id;
    const isCorrect = isExactAnswer ? answerId === expectedAnswerId : answer === expectedAnswer;
    const nextStreak = isCorrect ? currentStreak + 1 : 0;
    const nextBestStreak = Math.max(bestRoundStreak, nextStreak);
    const nextProgress =
      answeredMode === "reading" && isExactAnswer
        ? recordReadingLocationAttempt(progress, answeredReadingNote, answerId)
        : answeredMode === "reading"
          ? recordReadingAttempt(progress, answeredReadingNote, answer as ReadingNoteName)
          : isExactAnswer
            ? recordPitchLocationAttempt(progress, answeredPitchNote, answerId)
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

    const positionResults = currentMelody.map((note, index) => note.id === melodyAnswerNoteIds[index]);
    const correctCount = positionResults.filter(Boolean).length;
    const isCorrect = correctCount === currentMelody.length;
    const streakResult = positionResults.reduce(
      (result, positionIsCorrect) => {
        const streak = positionIsCorrect ? result.streak + 1 : 0;
        return { streak, best: Math.max(result.best, streak) };
      },
      { streak: currentStreak, best: bestRoundStreak },
    );
    const nextProgress = recordPitchSequenceAttempt(progress, currentMelody, melodyAnswerNoteIds);
    const firstAnswerKey = getPianoKeyById(melodyAnswerNoteIds[0] ?? "");

    setFeedback({
      answer: firstAnswerKey?.naturalName ?? "C",
      answerId: melodyAnswerNoteIds.join(" "),
      isCorrect,
    });
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
    setCurrentReadingNote(
      selectReadingNote({
        progress: nextProgress.reading,
        customReadingRange: nextSettings.customReadingRange,
        readingRange: nextSettings.readingRange,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
    setCurrentPitchNote(
      selectPitchNote({
        customPitchRange: nextSettings.customPitchRange,
        pitchRange: nextSettings.pitchRange,
        progress: nextProgress.pitch,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
    setCurrentMelody(
      selectPitchMelody({
        customPitchRange: nextSettings.customPitchRange,
        length: nextSettings.melodyLength,
        pitchRange: nextSettings.pitchRange,
        progress: nextProgress.pitch,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
    setMelodyAnswerNoteIds([]);
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
    const shortcutSource = getReadingNotes(settings.readingRange, settings.customReadingRange);

    function handleKeyDown(event: KeyboardEvent) {
      const shortcutOption = shortcutSource.find((note) => note.keyboardShortcut === event.key);
      if (mode === "reading" && shortcutOption !== undefined) {
        handleReadingKeyAnswer(shortcutOption.id);
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
    handleAnswer,
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
