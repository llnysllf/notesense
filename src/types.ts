export type NoteName = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type ReadingNoteName = "C" | "D" | "E" | "F" | "G";
export type PracticeMode = "reading" | "pitch";
export type RoundLength = 30 | 60 | 90;

export type TrainingNote = {
  id: string;
  name: ReadingNoteName;
  octave: number;
  frequency: number;
  staffY: number;
  keyboardShortcut: string;
};

export type PitchNote = {
  id: string;
  name: NoteName;
  octave: number;
  frequency: number;
  keyboardShortcut: string;
};

export type AttemptProgress = {
  attempts: number;
  correct: number;
};

export type ModeProgress = {
  totalAttempts: number;
  totalCorrect: number;
  bestRoundScore: number;
  noteStats: Record<string, AttemptProgress>;
  sessionsCompleted: number;
};

export type PracticeProgress = {
  reading: ModeProgress;
  pitch: ModeProgress;
};

export type PracticeSettings = {
  roundLength: RoundLength;
  adaptivePractice: boolean;
  autoPlayPitch: boolean;
  revealPitchAfterAnswer: boolean;
};

export type SessionSummary = {
  mode: PracticeMode;
  score: number;
  attempts: number;
  accuracy: number;
  bestStreak: number;
  focusItem?: string;
  suggestion: string;
};

export type FeedbackState = {
  answer: NoteName;
  isCorrect: boolean;
} | null;
