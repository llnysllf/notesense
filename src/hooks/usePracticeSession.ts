import { useCallback, useEffect, useRef, useState } from "react";
import { getPianoKeyById, getPitchNotes, getReadingNotes } from "../noteData";
import { ADVANCE_DELAY_MS } from "./practiceSessionConstants";
import { captureSingleEvidenceAttempt } from "./evidenceCapture";
import { playPracticePrompt, startPracticeRound, submitMelodyPracticeAnswer } from "./practiceSessionActions";
import { completeSessionRound, evaluateSingleAnswer } from "./practiceSessionLogic";
import { usePracticeItems } from "./usePracticeItems";
import { useReadingShortcuts } from "./useReadingShortcuts";
import type { UsePracticeSessionOptions, UsePracticeSessionResult } from "./practiceSessionTypes";
import type {
  FeedbackState,
  NoteName,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  ReadingMiss,
  SessionSummary,
  TrainingNote,
} from "../types";
import { buildReadingTestForm, buildReplaySet, getReadingModeRules, scoreReadingTest } from "../types";

type ReadingTestAnswer = { correct: boolean; responseMs: number };
type ReadingFixedQueueKind = "test" | "replay";

function buildReadingTestQueue(settings: PracticeSettings): TrainingNote[] {
  const notes = getReadingNotes(settings.readingRange, settings.customReadingRange);
  const noteMidis = notes.flatMap((note) => {
    const midi = getPianoKeyById(note.id)?.midi;
    return midi === undefined ? [] : [midi];
  });
  if (noteMidis.length === 0) return notes;

  const noteByMidi = new Map(notes.map((note) => [getPianoKeyById(note.id)?.midi, note]));
  const rules = getReadingModeRules(settings.readingMode);
  const promptCount = rules.fixedPromptCount ?? 20;
  const form = buildReadingTestForm({
    lowMidi: Math.min(...noteMidis),
    highMidi: Math.max(...noteMidis),
    allowedMidis: noteMidis,
    promptCount,
    seed: `${settings.readingRange}:${settings.customReadingRange.startNoteId}-${settings.customReadingRange.endNoteId}:v1`,
  });

  return form.prompts.flatMap((midi) => {
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

function buildReadingReplayQueue(settings: PracticeSettings, misses: readonly ReadingMiss[]): TrainingNote[] {
  const replayMidis = buildReplaySet(misses);
  if (replayMidis.length === 0) return [];

  const notes = getReadingNotes(settings.readingRange, settings.customReadingRange);
  const noteByMidi = new Map(notes.map((note) => [getPianoKeyById(note.id)?.midi, note]));

  return replayMidis.flatMap((midi) => {
    const note = noteByMidi.get(midi);
    return note === undefined ? [] : [note];
  });
}

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
  const [lookAheadReadingNote, setLookAheadReadingNote] = useState<TrainingNote | null>(null);
  const [isReadingPromptHidden, setIsReadingPromptHidden] = useState(false);
  const advanceTimerRef = useRef<number | null>(null);
  const audiationTimerRef = useRef<number | null>(null);
  const promptStartedAtRef = useRef<{ wallIso: string; clock: number } | null>(null);
  const sessionIdRef = useRef<string>("");
  const readingTestQueueRef = useRef<TrainingNote[]>([]);
  const readingTestIndexRef = useRef(0);
  const readingTestAnswersRef = useRef<ReadingTestAnswer[]>([]);
  const readingFixedQueueKindRef = useRef<ReadingFixedQueueKind | null>(null);
  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);
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
  useEffect(
    () => () => {
      clearAdvanceTimer();
      clearAudiationTimer();
    },
    [clearAdvanceTimer, clearAudiationTimer],
  );
  const finishRound = useCallback(() => {
    if (!isRunning) return;
    clearAdvanceTimer();
    clearAudiationTimer();
    if (mode === "reading" && settings.readingMode === "test") {
      setLastSummary(summarizeReadingTest(readingTestAnswersRef.current, false));
      setIsRunning(false);
      setRoundStartedAt(null);
      setFeedback(null);
      setTimeRemaining(settings.roundLength);
      setLookAheadReadingNote(null);
      setIsReadingPromptHidden(false);
      readingFixedQueueKindRef.current = null;
      return;
    }
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
    setLookAheadReadingNote(null);
    setIsReadingPromptHidden(false);
    readingFixedQueueKindRef.current = null;
  }, [
    bestRoundStreak,
    clearAudiationTimer,
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
    clearAudiationTimer();
    readingTestQueueRef.current = [];
    readingTestIndexRef.current = 0;
    readingTestAnswersRef.current = [];
    readingFixedQueueKindRef.current = null;
    setMode(nextMode);
    setFeedback(null);
    setMelodyAnswerNoteIds([]);
    setLastSummary(null);
    setLookAheadReadingNote(null);
    setIsReadingPromptHidden(false);
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
    clearAudiationTimer();
    sessionIdRef.current = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
    promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
    if (mode === "reading" && settings.readingMode === "test") {
      const queue = buildReadingTestQueue(settings);
      readingTestQueueRef.current = queue;
      readingTestIndexRef.current = 0;
      readingTestAnswersRef.current = [];
      readingFixedQueueKindRef.current = "test";
      setRoundStartedAt(Date.now());
      setIsRunning(true);
      setFeedback(null);
      setLastSummary(null);
      setRoundAttempts(0);
      setRoundCorrect(0);
      setCurrentStreak(0);
      setBestRoundStreak(0);
      setTimeRemaining(settings.roundLength);
      if (queue[0] !== undefined) setCurrentReadingNote(queue[0]);
      setLookAheadReadingNote(null);
      scheduleAudiationHide();
      return;
    }
    if (mode === "reading" && settings.readingMode === "learn") {
      const first = getNextReadingNote(currentReadingNote.id);
      const next = getNextReadingNote(first.id);
      readingFixedQueueKindRef.current = null;
      setRoundStartedAt(Date.now());
      setIsRunning(true);
      setFeedback(null);
      setLastSummary(null);
      setRoundAttempts(0);
      setRoundCorrect(0);
      setCurrentStreak(0);
      setBestRoundStreak(0);
      setTimeRemaining(settings.roundLength);
      setCurrentReadingNote(first);
      setLookAheadReadingNote(next);
      setIsReadingPromptHidden(false);
      return;
    }
    setLookAheadReadingNote(null);
    setIsReadingPromptHidden(false);
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
    readingFixedQueueKindRef.current = null;
  }

  function startReplay(misses: readonly ReadingMiss[]) {
    const queue = buildReadingReplayQueue(settings, misses);
    if (mode !== "reading" || queue.length === 0) {
      startRound();
      return;
    }

    clearAdvanceTimer();
    clearAudiationTimer();
    sessionIdRef.current = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
    promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
    readingTestQueueRef.current = queue;
    readingTestIndexRef.current = 0;
    readingTestAnswersRef.current = [];
    readingFixedQueueKindRef.current = "replay";
    setRoundStartedAt(Date.now());
    setIsRunning(true);
    setFeedback(null);
    setLastSummary(null);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setTimeRemaining(settings.roundLength);
    setLookAheadReadingNote(null);
    setIsReadingPromptHidden(false);
    setCurrentReadingNote(queue[0]!);
  }

  function playCurrentNote() {
    playPracticePrompt({
      mode,
      settings,
      melody: currentMelody,
      readingFrequency: currentReadingNote.frequency,
      pitchFrequency: currentPitchNote.frequency,
    });
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
    const readingFixedKind = answeredMode === "reading" ? readingFixedQueueKindRef.current : null;
    const isReadingTestAnswer = readingFixedKind === "test";
    const isReadingReplayAnswer = readingFixedKind === "replay";
    if (!isReadingTestAnswer) {
      onProgressChange(nextProgress);
    } else {
      readingTestAnswersRef.current.push({
        correct: isCorrect,
        responseMs: Math.max(
          0,
          Math.round(performance.now() - (promptStartedAtRef.current?.clock ?? performance.now())),
        ),
      });
    }
    clearAudiationTimer();
    const answerMidi = getPianoKeyById(answerId ?? "")?.midi;
    if (answeredMode !== "reading" || getReadingModeRules(settings.readingMode).contributesEvidence) {
      captureSingleEvidenceAttempt({
        timing: promptStartedAtRef.current,
        sessionId: sessionIdRef.current,
        mode: answeredMode,
        promptId: answeredMode === "reading" ? answeredReadingNote.id : answeredPitchNote.id,
        correct: isCorrect,
        ...(answerMidi === undefined ? {} : { answerMidi }),
      });
    }

    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      setFeedback(null);
      if (answeredMode === "reading") {
        if (isReadingTestAnswer) {
          const nextIndex = readingTestIndexRef.current + 1;
          const nextTestNote = readingTestQueueRef.current[nextIndex];
          if (nextTestNote === undefined) {
            setLastSummary(summarizeReadingTest(readingTestAnswersRef.current, true));
            setIsRunning(false);
            setRoundStartedAt(null);
            setTimeRemaining(settings.roundLength);
            setIsReadingPromptHidden(false);
            return;
          }
          readingTestIndexRef.current = nextIndex;
          promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
          setCurrentReadingNote(nextTestNote);
          scheduleAudiationHide();
          return;
        }
        if (isReadingReplayAnswer) {
          if (!isCorrect) {
            promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
            return;
          }

          const nextIndex = readingTestIndexRef.current + 1;
          const nextReplayNote = readingTestQueueRef.current[nextIndex];
          if (nextReplayNote === undefined) {
            const { nextProgress: completedProgress, summary } = completeSessionRound({
              mode: "reading",
              settings,
              progress: nextProgress,
              roundAttempts: roundAttempts + 1,
              roundCorrect: roundCorrect + 1,
              bestRoundStreak: nextBestStreak,
              roundStartedAt,
              timeRemaining,
            });
            onProgressChange(completedProgress);
            setLastSummary(summary);
            setIsRunning(false);
            setRoundStartedAt(null);
            setTimeRemaining(settings.roundLength);
            setLookAheadReadingNote(null);
            setIsReadingPromptHidden(false);
            readingTestQueueRef.current = [];
            readingTestIndexRef.current = 0;
            readingFixedQueueKindRef.current = null;
            return;
          }

          readingTestIndexRef.current = nextIndex;
          promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
          setCurrentReadingNote(nextReplayNote);
          return;
        }
        promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
        if (settings.readingMode === "learn") {
          const nextReadingNote = lookAheadReadingNote ?? getNextReadingNote(answeredReadingNote.id, nextProgress);
          setCurrentReadingNote(nextReadingNote);
          setLookAheadReadingNote(getNextReadingNote(nextReadingNote.id, nextProgress));
        } else {
          setCurrentReadingNote((note) => getNextReadingNote(note.id, nextProgress));
          setLookAheadReadingNote(null);
        }
        return;
      }
      const nextPitch = getNextPitchNote(answeredPitchNote.id, nextProgress);
      promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      setCurrentPitchNote(nextPitch);
      if (settings.autoPlayPitch) {
        playPracticePrompt({
          mode: "pitch",
          settings,
          melody: [],
          readingFrequency: nextPitch.frequency,
          pitchFrequency: nextPitch.frequency,
        });
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

    submitMelodyPracticeAnswer({
      progress,
      melody: currentMelody,
      answerNoteIds: melodyAnswerNoteIds,
      currentStreak,
      bestRoundStreak,
      timing: promptStartedAtRef.current,
      sessionId: sessionIdRef.current,
      answerMidis: melodyAnswerNoteIds.map((id) => getPianoKeyById(id)?.midi),
      setFeedback,
      setRoundAttempts,
      setRoundCorrect,
      setCurrentStreak,
      setBestRoundStreak,
      onProgressChange,
      clearAdvanceTimer,
      setAdvanceTimer: (value) => {
        advanceTimerRef.current = value;
      },
      getNextPitchMelody,
      setCurrentMelody,
      setMelodyAnswerNoteIds,
      autoPlayPitch: settings.autoPlayPitch,
      setPromptTiming: () => {
        promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      },
    });
  }

  function resetSession(nextSettings: PracticeSettings, nextProgress: PracticeProgress) {
    clearAdvanceTimer();
    clearAudiationTimer();
    readingTestQueueRef.current = [];
    readingTestIndexRef.current = 0;
    readingTestAnswersRef.current = [];
    readingFixedQueueKindRef.current = null;
    resetItems(nextSettings, nextProgress);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setFeedback(null);
    setLastSummary(null);
    setLookAheadReadingNote(null);
    setIsReadingPromptHidden(false);
    setIsRunning(false);
    setRoundStartedAt(null);
    setTimeRemaining(nextSettings.roundLength);
  }

  useReadingShortcuts({ mode, settings, onAnswer: handleReadingKeyAnswer });

  return {
    mode,
    setPracticeMode,
    currentReadingNote,
    lookAheadReadingNote,
    isReadingPromptHidden,
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
