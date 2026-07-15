import type { NoteName, PracticeMode, PracticeSessionRecord, ReadingNoteName } from "@notesense/shared";

// Re-export the framework-agnostic data contract so existing `./types` imports keep working.
export type {
  AttemptProgress,
  CustomPitchRange,
  CustomReadingRange,
  MelodyLength,
  ModeProgress,
  NoteName,
  PracticeDataExport,
  PracticeDataImportResult,
  PracticeMode,
  PracticeProgress,
  PracticeSessionRecord,
  PracticeSettings,
  PitchExercise,
  PitchRange,
  ReadingNoteName,
  ReadingRange,
  RoundLength,
  Song,
  SongDifficulty,
  SongEvent,
  SongProgress,
  SongProgressEntry,
  TimeSignature,
} from "@notesense/shared";

export type StaffClef = "treble" | "bass";

export type TrainingNote = {
  id: string;
  name: ReadingNoteName;
  octave: number;
  frequency: number;
  staffY: number;
  clef: StaffClef;
  ledgerLineY?: number;
  ledgerLineYs?: number[];
  keyboardShortcut: string;
};

export type PitchNote = {
  id: string;
  name: NoteName;
  octave: number;
  frequency: number;
  keyboardShortcut: string;
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

export type SessionHistorySummary = {
  recentSessions: PracticeSessionRecord[];
  averageAccuracy: number;
  totalAttempts: number;
  totalPracticeSeconds: number;
  bestStreak: number;
};

export type DailyGoalSummary = {
  targetSessions: number;
  completedSessions: number;
  completionPercent: number;
  isComplete: boolean;
  currentStreak: number;
  bestStreak: number;
  todayPracticeSeconds: number;
  nextAction: string;
};

export type PracticeTrendPoint = {
  id: string;
  label: string;
  completedAt: string;
  accuracy: number;
  score: number;
  attempts: number;
};

export type PracticeInsightSummary = {
  trendPoints: PracticeTrendPoint[];
  latestAccuracy: number;
  accuracyDelta: number;
  bestStreak: number;
  totalPracticeSeconds: number;
};

export type PracticePlanTone = "baseline" | "focus" | "recovery" | "advance" | "steady";

export type PracticePlan = {
  tone: PracticePlanTone;
  title: string;
  focus: string;
  reason: string;
  target: string;
  steps: string[];
};

export type MasteryStatus = "new" | "learning" | "focus" | "strong";

export type MasteryItem = {
  id: string;
  label: string;
  attempts: number;
  accuracy: number;
  status: MasteryStatus;
};

export type MasterySummary = {
  items: MasteryItem[];
  averageAccuracy: number;
  strongCount: number;
  totalCount: number;
};

export type FeedbackState = {
  answer: NoteName;
  answerId?: string;
  isCorrect: boolean;
} | null;
