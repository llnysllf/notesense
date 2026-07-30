import type { MutableRefObject } from "react";
import { getPianoKeyById, getPitchNotes } from "../noteData";
import { submitMelodyPracticeAnswer } from "./practiceSessionActions";
import type { FeedbackState, PitchNote, PracticeMode, PracticeProgress, PracticeSettings } from "../types";

type MelodyAnswerControlsOptions = {
  mode: PracticeMode;
  settings: PracticeSettings;
  progress: PracticeProgress;
  currentMelody: PitchNote[];
  melodyAnswerNoteIds: string[];
  currentStreak: number;
  bestRoundStreak: number;
  isRunning: boolean;
  feedback: FeedbackState;
  promptStartedAtRef: MutableRefObject<{ wallIso: string; clock: number } | null>;
  sessionIdRef: MutableRefObject<string>;
  advanceTimerRef: MutableRefObject<number | null>;
  setFeedback: (value: FeedbackState) => void;
  setRoundAttempts: (update: (value: number) => number) => void;
  setRoundCorrect: (update: (value: number) => number) => void;
  setCurrentStreak: (value: number) => void;
  setBestRoundStreak: (value: number) => void;
  setCurrentMelody: (value: PitchNote[]) => void;
  setMelodyAnswerNoteIds: (value: string[] | ((value: string[]) => string[])) => void;
  onProgressChange: (next: PracticeProgress) => void;
  clearAdvanceTimer: () => void;
  getNextPitchMelody: (previousId?: string, nextProgress?: PracticeProgress) => PitchNote[];
};

export function useMelodyAnswerControls(options: MelodyAnswerControlsOptions) {
  const {
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
  } = options;

  function handleMelodyNoteInput(noteId: string) {
    if (mode !== "pitch" || settings.pitchExercise !== "melody" || !isRunning || feedback !== null) {
      return;
    }
    if (melodyAnswerNoteIds.length >= currentMelody.length) return;
    if (!getPitchNotes(settings.pitchRange, settings.customPitchRange).some((note) => note.id === noteId)) {
      return;
    }
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

  return { handleMelodyNoteInput, undoMelodyAnswer, clearMelodyAnswer, submitMelodyAnswer };
}
