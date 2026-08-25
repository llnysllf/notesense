import type {
  AttemptProgress,
  ModeProgress,
  PracticeDataExport,
  PracticeDataImportResult,
  PracticeMode,
  PracticeProgress,
  PracticeSessionRecord,
  PracticeSettings,
} from "./types";
import { normalizeSettings } from "./practiceSettings";

export {
  DEFAULT_CUSTOM_PITCH_RANGE,
  DEFAULT_CUSTOM_READING_RANGE,
  DEFAULT_MELODY_LENGTH,
  MAX_PITCH_SEQUENCE_LENGTH,
  MIN_PITCH_SEQUENCE_LENGTH,
  DEFAULT_PITCH_EXERCISE,
  DEFAULT_PITCH_RANGE,
  DEFAULT_READING_RANGE,
  MAX_ROUND_LENGTH_SECONDS,
  MIN_ROUND_LENGTH_SECONDS,
  PITCH_RANGE_IDS,
  READING_RANGE_IDS,
  UNLIMITED_ROUND_LENGTH,
  defaultSettings,
  isPitchRange,
  isReadingRange,
  normalizeSettings,
} from "./practiceSettings";

export const DATA_EXPORT_SCHEMA_VERSION = 2;
export const SESSION_HISTORY_LIMIT = 20;
export const INVALID_IMPORT_ERROR = "Choose a valid NoteSense export file.";
export const UNSUPPORTED_IMPORT_ERROR = "This NoteSense export version is not supported.";

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

/**
 * A catalog-less empty progress seed. The web app passes a richer seed that
 * pre-populates `noteStats` for every known note; the sync backend uses this
 * minimal seed because it validates untrusted documents structurally and has no
 * knowledge of the note catalog.
 */
export function createEmptyPracticeProgress(): PracticeProgress {
  const emptyMode = (): ModeProgress => ({
    totalAttempts: 0,
    totalCorrect: 0,
    bestRoundScore: 0,
    sessionsCompleted: 0,
    noteStats: {},
  });

  return { reading: emptyMode(), pitch: emptyMode(), history: [] };
}

export function normalizeSessionHistory(history: unknown): PracticeSessionRecord[] {
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

function normalizeModeProgress(progress: unknown, mode: PracticeMode, emptyProgress: PracticeProgress): ModeProgress {
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

export function normalizeProgress(progress: unknown, emptyProgress: PracticeProgress): PracticeProgress {
  const progressRecord = isRecord(progress) ? progress : {};

  if ("reading" in progressRecord || "pitch" in progressRecord) {
    return {
      reading: normalizeModeProgress(progressRecord.reading, "reading", emptyProgress),
      pitch: normalizeModeProgress(progressRecord.pitch, "pitch", emptyProgress),
      history: normalizeSessionHistory(progressRecord.history),
    };
  }

  return {
    reading: normalizeModeProgress(progressRecord, "reading", emptyProgress),
    pitch: normalizeModeProgress(undefined, "pitch", emptyProgress),
    history: [],
  };
}

export function createPracticeDataExport(
  progress: PracticeProgress,
  settings: PracticeSettings,
  emptyProgress: PracticeProgress,
  exportedAt = new Date().toISOString(),
  attemptEvents?: unknown[],
): PracticeDataExport {
  return {
    schemaVersion: DATA_EXPORT_SCHEMA_VERSION,
    exportedAt,
    progress: normalizeProgress(progress, emptyProgress),
    settings: normalizeSettings(settings),
    ...(attemptEvents ? { attemptEvents } : {}),
  };
}

export function serializePracticeDataExport(
  progress: PracticeProgress,
  settings: PracticeSettings,
  emptyProgress: PracticeProgress,
  exportedAt?: string,
  attemptEvents?: unknown[],
): string {
  return `${JSON.stringify(createPracticeDataExport(progress, settings, emptyProgress, exportedAt, attemptEvents), null, 2)}\n`;
}

export function createExportFileName(exportedAt = new Date()): string {
  const dateStamp = exportedAt.toISOString().slice(0, 10);
  return `notesense-progress-${dateStamp}.json`;
}

export function parsePracticeDataImport(
  fileContents: string,
  emptyProgress: PracticeProgress,
): PracticeDataImportResult {
  try {
    const parsedImport = JSON.parse(fileContents) as unknown;

    if (!isRecord(parsedImport) || !("progress" in parsedImport) || !("settings" in parsedImport)) {
      return { ok: false, error: INVALID_IMPORT_ERROR };
    }

    if (parsedImport.schemaVersion !== 1 && parsedImport.schemaVersion !== DATA_EXPORT_SCHEMA_VERSION) {
      return { ok: false, error: UNSUPPORTED_IMPORT_ERROR };
    }

    const exportedAt =
      typeof parsedImport.exportedAt === "string" && !Number.isNaN(Date.parse(parsedImport.exportedAt))
        ? parsedImport.exportedAt
        : new Date(0).toISOString();

    return {
      ok: true,
      data: createPracticeDataExport(
        normalizeProgress(parsedImport.progress, emptyProgress),
        normalizeSettings(parsedImport.settings),
        emptyProgress,
        exportedAt,
        parsedImport.schemaVersion === 2 && Array.isArray(parsedImport.attemptEvents)
          ? parsedImport.attemptEvents
          : undefined,
      ),
    };
  } catch {
    return { ok: false, error: INVALID_IMPORT_ERROR };
  }
}
