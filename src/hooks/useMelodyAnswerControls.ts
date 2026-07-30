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
  const promptStartedAtRef = options.promptStartedAtRef;

  function handleMelodyNoteInput(noteId: string) {
    if (
      options.mode !== "pitch" ||
      options.settings.pitchExercise !== "melody" ||
      !options.isRunning ||
      options.feedback !== null
    ) {
      return;
    }
    if (options.melodyAnswerNoteIds.length >= options.currentMelody.length) return;
    if (
      !getPitchNotes(options.settings.pitchRange, options.settings.customPitchRange).some((note) => note.id === noteId)
    ) {
      return;
    }
    options.setMelodyAnswerNoteIds((answer) => [...answer, noteId]);
  }

  function undoMelodyAnswer() {
    if (options.feedback !== null) return;
    options.setMelodyAnswerNoteIds((answer) => answer.slice(0, -1));
  }

  function clearMelodyAnswer() {
    if (options.feedback !== null) return;
    options.setMelodyAnswerNoteIds([]);
  }

  function submitMelodyAnswer() {
    if (
      options.mode !== "pitch" ||
      options.settings.pitchExercise !== "melody" ||
      !options.isRunning ||
      options.feedback !== null ||
      options.melodyAnswerNoteIds.length !== options.currentMelody.length
    ) {
      return;
    }

    submitMelodyPracticeAnswer({
      progress: options.progress,
      melody: options.currentMelody,
      answerNoteIds: options.melodyAnswerNoteIds,
      currentStreak: options.currentStreak,
      bestRoundStreak: options.bestRoundStreak,
      timing: promptStartedAtRef.current,
      sessionId: options.sessionIdRef.current,
      answerMidis: options.melodyAnswerNoteIds.map((id) => getPianoKeyById(id)?.midi),
      setFeedback: options.setFeedback,
      setRoundAttempts: options.setRoundAttempts,
      setRoundCorrect: options.setRoundCorrect,
      setCurrentStreak: options.setCurrentStreak,
      setBestRoundStreak: options.setBestRoundStreak,
      onProgressChange: options.onProgressChange,
      clearAdvanceTimer: options.clearAdvanceTimer,
      setAdvanceTimer: (value) => {
        options.advanceTimerRef.current = value;
      },
      getNextPitchMelody: options.getNextPitchMelody,
      setCurrentMelody: options.setCurrentMelody,
      setMelodyAnswerNoteIds: options.setMelodyAnswerNoteIds,
      autoPlayPitch: options.settings.autoPlayPitch,
      setPromptTiming: () => {
        promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      },
    });
  }

  return { handleMelodyNoteInput, undoMelodyAnswer, clearMelodyAnswer, submitMelodyAnswer };
}
