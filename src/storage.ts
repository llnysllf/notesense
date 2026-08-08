import {
  createPracticeDataExport as createSharedExport,
  normalizeSongProgress,
  normalizeDailyPlan,
  defaultSettings,
  normalizeProgress,
  normalizePlacementOutcome,
  normalizeVocalRange,
  normalizeReadingScoreHistory,
  normalizeSettings,
  parsePracticeDataImport as parseSharedImport,
  serializePracticeDataExport as serializeSharedExport,
  SESSION_HISTORY_LIMIT,
} from "@notesense/shared";
import { emptyProgress, getPianoKeyById } from "./noteData";
import type {
  DailyPlan,
  NoteName,
  PlacementOutcome,
  ReadingScoreRecord,
  VocalRange,
  SongProgress,
  PitchNote,
  PracticeDataExport,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  PracticeSessionRecord,
  ReadingNoteName,
  TrainingNote,
} from "./types";

const STORAGE_KEY = "notesense.progress.v2";
const LEGACY_STORAGE_KEY = "notesense.progress.v1";
const SETTINGS_STORAGE_KEY = "notesense.settings.v3";
const SONG_PROGRESS_STORAGE_KEY = "notesense.songProgress.v1";
const DAILY_PLAN_STORAGE_KEY = "notesense.dailyPlan.v1";
const READING_SCORE_STORAGE_KEY = "notesense.readingScores.v1";
const PLACEMENT_STORAGE_KEY = "notesense.placement.v1";
const VOCAL_RANGE_STORAGE_KEY = "notesense.vocalRange.v1";

export {
  compareSongsByDifficulty,
  DEFAULT_TIME_SIGNATURE,
  getEventMeasureStarts,
  getSongDifficulty,
  getSongNoteRange,
  getTimeSignatureLabel,
  normalizeSong,
} from "@notesense/shared";
export {
  createExportFileName,
  defaultSettings,
  SESSION_HISTORY_LIMIT,
  DATA_EXPORT_SCHEMA_VERSION,
  INVALID_IMPORT_ERROR,
  UNSUPPORTED_IMPORT_ERROR,
} from "@notesense/shared";

export function loadProgress(): PracticeProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      return emptyProgress;
    }

    return normalizeProgress(JSON.parse(stored) as unknown, emptyProgress);
  } catch {
    return emptyProgress;
  }
}

export function saveProgress(progress: PracticeProgress): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function loadSongProgress(): SongProgress {
  try {
    const stored = window.localStorage.getItem(SONG_PROGRESS_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    return normalizeSongProgress(JSON.parse(stored) as unknown);
  } catch {
    return {};
  }
}

export function saveSongProgress(songProgress: SongProgress): boolean {
  try {
    window.localStorage.setItem(SONG_PROGRESS_STORAGE_KEY, JSON.stringify(songProgress));
    return true;
  } catch {
    return false;
  }
}

// Today's plan is a cache, not a record of learning: if it is missing or
// malformed it is simply regenerated, so a failure here never costs progress.
export function loadDailyPlan(): DailyPlan | undefined {
  try {
    const stored = window.localStorage.getItem(DAILY_PLAN_STORAGE_KEY);
    if (!stored) {
      return undefined;
    }

    return normalizeDailyPlan(JSON.parse(stored) as unknown);
  } catch {
    return undefined;
  }
}

export function saveDailyPlan(plan: DailyPlan): boolean {
  try {
    window.localStorage.setItem(DAILY_PLAN_STORAGE_KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

// Assessment results are their own record, kept apart from practice evidence.
// A Reading Score is a measurement of the learner, not a practice attempt, and
// mixing the two would let a test quietly drive adaptive repetition.
export function loadReadingScores(): ReadingScoreRecord[] {
  try {
    const stored = window.localStorage.getItem(READING_SCORE_STORAGE_KEY);
    return stored ? normalizeReadingScoreHistory(JSON.parse(stored) as unknown) : [];
  } catch {
    return [];
  }
}

export function saveReadingScores(history: readonly ReadingScoreRecord[]): boolean {
  try {
    window.localStorage.setItem(READING_SCORE_STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}

// The placement result is a starting hint, so a missing or malformed one costs
// nothing: the learner is simply offered the check again.
export function loadPlacement(): PlacementOutcome | undefined {
  try {
    const stored = window.localStorage.getItem(PLACEMENT_STORAGE_KEY);
    return stored ? normalizePlacementOutcome(JSON.parse(stored) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function savePlacement(outcome: PlacementOutcome): boolean {
  try {
    window.localStorage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(outcome));
    return true;
  } catch {
    return false;
  }
}

// The learner's comfortable singing range: two MIDI numbers. No audio, no pitch
// frames, no contour — those exist only for the length of a take and are never
// written anywhere.
export function loadVocalRange(): VocalRange | undefined {
  try {
    const stored = window.localStorage.getItem(VOCAL_RANGE_STORAGE_KEY);
    return stored ? normalizeVocalRange(JSON.parse(stored) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function saveVocalRange(range: VocalRange): boolean {
  try {
    window.localStorage.setItem(VOCAL_RANGE_STORAGE_KEY, JSON.stringify(range));
    return true;
  } catch {
    return false;
  }
}

export function recordSongCompletion(
  songProgress: SongProgress,
  songId: string,
  accuracy: number,
  now: Date = new Date(),
): SongProgress {
  const existing = songProgress[songId];

  return {
    ...songProgress,
    [songId]: {
      bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, Math.min(100, Math.max(0, Math.round(accuracy)))),
      completions: (existing?.completions ?? 0) + 1,
      lastPlayedAt: now.toISOString(),
    },
  };
}

export function loadSettings(): PracticeSettings {
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return defaultSettings;
    }

    return normalizeSettings(JSON.parse(stored) as unknown);
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: PracticeSettings): boolean {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function createPracticeDataExport(
  progress: PracticeProgress,
  settings: PracticeSettings,
  exportedAt?: string,
  attemptEvents?: unknown[],
): PracticeDataExport {
  return createSharedExport(progress, settings, emptyProgress, exportedAt, attemptEvents);
}

export function serializePracticeDataExport(
  progress: PracticeProgress,
  settings: PracticeSettings,
  exportedAt?: string,
  attemptEvents?: unknown[],
): string {
  return serializeSharedExport(progress, settings, emptyProgress, exportedAt, attemptEvents);
}

export function parsePracticeDataImport(fileContents: string) {
  return parseSharedImport(fileContents, emptyProgress);
}

function recordModeAttempt(
  progress: PracticeProgress,
  mode: PracticeMode,
  note: TrainingNote | PitchNote,
  answer: NoteName,
  isCorrect = answer === note.name,
): PracticeProgress {
  const modeProgress = progress[mode];
  const currentNoteStats = modeProgress.noteStats[note.id] ?? { attempts: 0, correct: 0 };

  return {
    ...progress,
    [mode]: {
      ...modeProgress,
      totalAttempts: modeProgress.totalAttempts + 1,
      totalCorrect: modeProgress.totalCorrect + (isCorrect ? 1 : 0),
      noteStats: {
        ...modeProgress.noteStats,
        [note.id]: {
          attempts: currentNoteStats.attempts + 1,
          correct: currentNoteStats.correct + (isCorrect ? 1 : 0),
        },
      },
    },
  };
}

export function recordReadingAttempt(
  progress: PracticeProgress,
  note: TrainingNote,
  answer: ReadingNoteName,
): PracticeProgress {
  return recordModeAttempt(progress, "reading", note, answer);
}

export function recordReadingLocationAttempt(
  progress: PracticeProgress,
  note: TrainingNote,
  answerNoteId: string,
): PracticeProgress {
  const answerKey = getPianoKeyById(answerNoteId);

  return recordModeAttempt(progress, "reading", note, answerKey?.naturalName ?? note.name, answerNoteId === note.id);
}

export function recordPitchAttempt(progress: PracticeProgress, note: PitchNote, answer: NoteName): PracticeProgress {
  return recordModeAttempt(progress, "pitch", note, answer);
}

export function recordPitchLocationAttempt(
  progress: PracticeProgress,
  note: PitchNote,
  answerNoteId: string,
): PracticeProgress {
  return recordModeAttempt(progress, "pitch", note, note.name, answerNoteId === note.id);
}

export function recordPitchSequenceAttempt(
  progress: PracticeProgress,
  notes: PitchNote[],
  answerNoteIds: string[],
): PracticeProgress {
  return notes.reduce(
    (nextProgress, note, index) => recordPitchLocationAttempt(nextProgress, note, answerNoteIds[index] ?? ""),
    progress,
  );
}

export function completeRound(progress: PracticeProgress, session: PracticeSessionRecord): PracticeProgress {
  const modeProgress = progress[session.mode];

  return {
    ...progress,
    [session.mode]: {
      ...modeProgress,
      bestRoundScore: Math.max(modeProgress.bestRoundScore, session.score),
      sessionsCompleted: modeProgress.sessionsCompleted + 1,
    },
    history: [session, ...progress.history].slice(0, SESSION_HISTORY_LIMIT),
  };
}

export function resetProgress(): PracticeProgress {
  return emptyProgress;
}
