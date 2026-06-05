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
  history: PracticeSessionRecord[];
};

export type PracticeSettings = {
  roundLength: RoundLength;
  adaptivePractice: boolean;
  autoPlayPitch: boolean;
  revealPitchAfterAnswer: boolean;
};

export type PracticeDataExport = {
  schemaVersion: 1;
  exportedAt: string;
  progress: PracticeProgress;
  settings: PracticeSettings;
};

export type PracticeDataImportResult =
  | {
      ok: true;
      data: PracticeDataExport;
    }
  | {
      ok: false;
      error: string;
    };

export type DataStatus = {
  message: string;
  tone: "success" | "warning";
} | null;

export type SessionSummary = {
  mode: PracticeMode;
  score: number;
  attempts: number;
  accuracy: number;
  bestStreak: number;
  focusItem?: string;
  suggestion: string;
};

export type PracticeSessionRecord = {
  id: string;
  mode: PracticeMode;
  completedAt: string;
  durationSeconds: number;
  score: number;
  attempts: number;
  accuracy: number;
  bestStreak: number;
};

export type SessionHistorySummary = {
  recentSessions: PracticeSessionRecord[];
  averageAccuracy: number;
  totalAttempts: number;
  totalPracticeSeconds: number;
  bestStreak: number;
};

export type FeedbackState = {
  answer: NoteName;
  isCorrect: boolean;
} | null;
