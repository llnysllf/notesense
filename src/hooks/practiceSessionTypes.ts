import type {
  FeedbackState,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  SessionSummary,
  TrainingNote,
} from "../types";

export type UsePracticeSessionOptions = {
  settings: PracticeSettings;
  progress: PracticeProgress;
  onProgressChange: (next: PracticeProgress) => void;
};

export type UsePracticeSessionResult = {
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
};
