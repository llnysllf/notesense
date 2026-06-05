import { emptyProgress } from "./noteData";
import type {
  AttemptProgress,
  ModeProgress,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeDataExport,
  PracticeDataImportResult,
  PracticeProgress,
  PracticeSettings,
  PracticeSessionRecord,
  ReadingNoteName,
  TrainingNote,
} from "./types";

const STORAGE_KEY = "notesense.progress.v2";
const LEGACY_STORAGE_KEY = "notesense.progress.v1";
const SETTINGS_STORAGE_KEY = "notesense.settings.v3";
export const SESSION_HISTORY_LIMIT = 20;
export const DATA_EXPORT_SCHEMA_VERSION = 1;
export const INVALID_IMPORT_ERROR = "Choose a valid NoteSense export file.";
export const UNSUPPORTED_IMPORT_ERROR = "This NoteSense export version is not supported.";

export const defaultSettings: PracticeSettings = {
  roundLength: 60,
  adaptivePractice: true,
  autoPlayPitch: true,
  revealPitchAfterAnswer: true,
};

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "reading" || value === "pitch";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSafeWholeNumber(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.round(numberValue));
}

function normalizeSessionHistory(history: unknown): PracticeSessionRecord[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((session, index): PracticeSessionRecord | null => {
      if (!session || typeof session !== "object") {
        return null;
      }

      const sessionRecord = session as Partial<PracticeSessionRecord>;
      if (!isPracticeMode(sessionRecord.mode)) {
        return null;
      }

      const completedAt =
        typeof sessionRecord.completedAt === "string" && !Number.isNaN(Date.parse(sessionRecord.completedAt))
          ? sessionRecord.completedAt
          : new Date(0).toISOString();
      const attempts = toSafeWholeNumber(sessionRecord.attempts);
      const score = Math.min(attempts, toSafeWholeNumber(sessionRecord.score));

      return {
        id:
          typeof sessionRecord.id === "string" && sessionRecord.id.trim()
            ? sessionRecord.id
            : `${sessionRecord.mode}-${completedAt}-${index}`,
        mode: sessionRecord.mode,
        completedAt,
        durationSeconds: toSafeWholeNumber(sessionRecord.durationSeconds),
        score,
        attempts,
        accuracy: attempts > 0 ? Math.round((score / attempts) * 100) : 0,
        bestStreak: toSafeWholeNumber(sessionRecord.bestStreak),
      };
    })
    .filter((session): session is PracticeSessionRecord => Boolean(session))
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, SESSION_HISTORY_LIMIT);
}

function normalizeNoteStats(
  noteStats: unknown,
  defaultNoteStats: ModeProgress["noteStats"],
): Record<string, AttemptProgress> {
  const normalizedStats = { ...defaultNoteStats };

  if (!isRecord(noteStats)) {
    return normalizedStats;
  }

  Object.entries(noteStats).forEach(([noteId, stats]) => {
    if (!isRecord(stats)) {
      return;
    }

    const attempts = toSafeWholeNumber(stats.attempts);
    normalizedStats[noteId] = {
      attempts,
      correct: Math.min(attempts, toSafeWholeNumber(stats.correct)),
    };
  });

  return normalizedStats;
}

function normalizeModeProgress(progress: unknown, mode: PracticeMode): ModeProgress {
  const emptyModeProgress = emptyProgress[mode];
  const progressRecord = isRecord(progress) ? progress : {};
  const totalAttempts = toSafeWholeNumber(progressRecord.totalAttempts);

  return {
    totalAttempts,
    totalCorrect: Math.min(totalAttempts, toSafeWholeNumber(progressRecord.totalCorrect)),
    bestRoundScore: toSafeWholeNumber(progressRecord.bestRoundScore),
    sessionsCompleted: toSafeWholeNumber(progressRecord.sessionsCompleted),
    noteStats: normalizeNoteStats(progressRecord.noteStats, emptyModeProgress.noteStats),
  };
}

function normalizeProgress(progress: unknown): PracticeProgress {
  const progressRecord = isRecord(progress) ? progress : {};

  if ("reading" in progressRecord || "pitch" in progressRecord) {
    return {
      reading: normalizeModeProgress(progressRecord.reading, "reading"),
      pitch: normalizeModeProgress(progressRecord.pitch, "pitch"),
      history: normalizeSessionHistory(progressRecord.history),
    };
  }

  return {
    reading: normalizeModeProgress(progressRecord, "reading"),
    pitch: normalizeModeProgress(undefined, "pitch"),
    history: [],
  };
}

export function loadProgress(): PracticeProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      return emptyProgress;
    }

    return normalizeProgress(JSON.parse(stored) as Partial<PracticeProgress>);
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

function normalizeSettings(settings: unknown): PracticeSettings {
  const settingsRecord = isRecord(settings) ? settings : {};
  const roundLength = [30, 60, 90].includes(Number(settingsRecord.roundLength))
    ? (Number(settingsRecord.roundLength) as PracticeSettings["roundLength"])
    : defaultSettings.roundLength;

  return {
    roundLength,
    adaptivePractice:
      typeof settingsRecord.adaptivePractice === "boolean"
        ? settingsRecord.adaptivePractice
        : defaultSettings.adaptivePractice,
    autoPlayPitch:
      typeof settingsRecord.autoPlayPitch === "boolean" ? settingsRecord.autoPlayPitch : defaultSettings.autoPlayPitch,
    revealPitchAfterAnswer:
      typeof settingsRecord.revealPitchAfterAnswer === "boolean"
        ? settingsRecord.revealPitchAfterAnswer
        : defaultSettings.revealPitchAfterAnswer,
  };
}

export function loadSettings(): PracticeSettings {
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return defaultSettings;
    }

    return normalizeSettings(JSON.parse(stored) as Partial<PracticeSettings>);
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
  exportedAt = new Date().toISOString(),
): PracticeDataExport {
  return {
    schemaVersion: DATA_EXPORT_SCHEMA_VERSION,
    exportedAt,
    progress: normalizeProgress(progress),
    settings: normalizeSettings(settings),
  };
}

export function serializePracticeDataExport(
  progress: PracticeProgress,
  settings: PracticeSettings,
  exportedAt?: string,
): string {
  return `${JSON.stringify(createPracticeDataExport(progress, settings, exportedAt), null, 2)}\n`;
}

export function createExportFileName(exportedAt = new Date()): string {
  const dateStamp = exportedAt.toISOString().slice(0, 10);
  return `notesense-progress-${dateStamp}.json`;
}

export function parsePracticeDataImport(fileContents: string): PracticeDataImportResult {
  try {
    const parsedImport = JSON.parse(fileContents) as unknown;

    if (!isRecord(parsedImport) || !("progress" in parsedImport) || !("settings" in parsedImport)) {
      return { ok: false, error: INVALID_IMPORT_ERROR };
    }

    if (parsedImport.schemaVersion !== DATA_EXPORT_SCHEMA_VERSION) {
      return { ok: false, error: UNSUPPORTED_IMPORT_ERROR };
    }

    const exportedAt =
      typeof parsedImport.exportedAt === "string" && !Number.isNaN(Date.parse(parsedImport.exportedAt))
        ? parsedImport.exportedAt
        : new Date(0).toISOString();

    return {
      ok: true,
      data: createPracticeDataExport(
        normalizeProgress(parsedImport.progress),
        normalizeSettings(parsedImport.settings),
        exportedAt,
      ),
    };
  } catch {
    return { ok: false, error: INVALID_IMPORT_ERROR };
  }
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
