export type NoteName = "C" | "D" | "E" | "F" | "G";

export type TrainingNote = {
  id: string;
  name: NoteName;
  octave: number;
  frequency: number;
  staffY: number;
  keyboardShortcut: string;
};

export type NoteProgress = {
  attempts: number;
  correct: number;
};

export type PracticeProgress = {
  totalAttempts: number;
  totalCorrect: number;
  bestRoundScore: number;
  noteStats: Record<string, NoteProgress>;
  sessionsCompleted: number;
};

export type FeedbackState = {
  answer: NoteName;
  isCorrect: boolean;
} | null;
