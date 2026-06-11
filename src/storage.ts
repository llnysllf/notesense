import {
  createPracticeDataExport as createSharedExport,
  defaultSettings,
  normalizeProgress,
  normalizeSettings,
  parsePracticeDataImport as parseSharedImport,
  serializePracticeDataExport as serializeSharedExport,
  SESSION_HISTORY_LIMIT,
} from "@notesense/shared";
import { emptyProgress } from "./noteData";
import type {
  NoteName,
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
): PracticeDataExport {
  return createSharedExport(progress, settings, emptyProgress, exportedAt);
}

export function serializePracticeDataExport(
  progress: PracticeProgress,
  settings: PracticeSettings,
  exportedAt?: string,
): string {
  return serializeSharedExport(progress, settings, emptyProgress, exportedAt);
}

export function parsePracticeDataImport(fileContents: string) {
  return parseSharedImport(fileContents, emptyProgress);
}

function recordModeAttempt(
  progress: PracticeProgress,
  mode: PracticeMode,
  note: TrainingNote | PitchNote,
  answer: NoteName,
): PracticeProgress {
  const isCorrect = answer === note.name;
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

export function recordPitchAttempt(progress: PracticeProgress, note: PitchNote, answer: NoteName): PracticeProgress {
  return recordModeAttempt(progress, "pitch", note, answer);
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
