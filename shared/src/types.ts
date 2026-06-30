// Framework-agnostic data contract shared by the web app and the sync backend.
// These types describe what is persisted locally, exported/imported, and synced.

export type NoteName = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type ReadingNoteName = NoteName;
export type PracticeMode = "reading" | "pitch";
export type RoundLength = 30 | 60 | 90;
export type ReadingRange =
  "treble-starter" | "bass-starter" | "treble-one-octave" | "bass-one-octave" | "grand-starter";

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

export type PracticeProgress = {
  reading: ModeProgress;
  pitch: ModeProgress;
  history: PracticeSessionRecord[];
};

export type PracticeSettings = {
  roundLength: RoundLength;
  readingRange: ReadingRange;
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
