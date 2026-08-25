// Framework-agnostic data contract shared by the web app and the sync backend.
// These types describe what is persisted locally, exported/imported, and synced.

export type NoteName = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type ReadingNoteName = NoteName;
export type PracticeMode = "reading" | "pitch";
// Whole seconds. Zero means the learner chose an open-ended round that only
// finishes when they press the stop button.
export type RoundLength = number;
export type ReadingRange =
  "treble-starter" | "bass-starter" | "treble-one-octave" | "bass-one-octave" | "grand-starter" | "custom";
export type PitchRange = "natural" | "chromatic" | "two-octaves" | "full" | "custom";
export type PitchExercise = "single" | "melody";
export type PitchSequenceLength = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
// Persisted settings used the original product term. Keep the field-level
// alias so existing local data and sync clients remain compatible.
export type MelodyLength = PitchSequenceLength;

export type CustomReadingRange = {
  startNoteId: string;
  endNoteId: string;
};

export type CustomPitchRange = {
  startNoteId: string;
  endNoteId: string;
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

import type { ReadingMode } from "./reading/readingMode";

export type PracticeSettings = {
  roundLength: RoundLength;
  readingRange: ReadingRange;
  customReadingRange: CustomReadingRange;
  pitchRange: PitchRange;
  customPitchRange: CustomPitchRange;
  pitchExercise: PitchExercise;
  melodyLength: MelodyLength;
  adaptivePractice: boolean;
  autoPlayPitch: boolean;
  revealPitchAfterAnswer: boolean;
  // A learner's measured MIDI input delay. This is device-local configuration,
  // never raw MIDI traffic or a device identifier.
  midiLatencyMs: number;
  // Which of the four sight-reading modes the reading screen is in.
  readingMode: ReadingMode;
  // Which sound world practice is heard in. Stored as an id rather than the
  // world itself so a stale export cannot pin an old voice definition.
  soundWorldId: string;
};

export type PracticeDataExport = {
  schemaVersion: 1 | 2;
  exportedAt: string;
  progress: PracticeProgress;
  settings: PracticeSettings;
  // Version 2 is additive: v1 readers can still consume the familiar progress
  // and settings fields, while v2 readers retain the durable evidence ledger.
  attemptEvents?: unknown[];
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
