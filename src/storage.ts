import {
  createPracticeDataExport as createSharedExport,
  normalizeSongProgress,
  defaultSettings,
  normalizeProgress,
  normalizeSettings,
  parsePracticeDataImport as parseSharedImport,
  serializePracticeDataExport as serializeSharedExport,
  SESSION_HISTORY_LIMIT,
} from "@notesense/shared";
import { emptyProgress, getPianoKeyById } from "./noteData";
import type {
  DailyMix,
  MixSegment,
  NoteName,
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
const DAILY_MIX_STORAGE_KEY = "notesense.dailyMix.v1";

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

const MIX_SEGMENT_ROLES = new Set(["weakness", "review", "reward"]);
const MIX_ACTIVITIES = new Set(["reading", "pitch", "song"]);

// The Daily Mix is local-only (not part of the synced practice-data contract),
// so it lives under its own key and is dropped entirely if malformed — the
// caller just regenerates a fresh mix for the day.
function normalizeMixSegment(value: unknown): MixSegment | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<MixSegment>;
  const target = candidate.target as { activity?: unknown } | undefined;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.detail !== "string" ||
    typeof candidate.estimatedSeconds !== "number" ||
    !MIX_SEGMENT_ROLES.has(candidate.role as string) ||
    typeof target !== "object" ||
    target === null ||
    !MIX_ACTIVITIES.has(target.activity as string)
  ) {
    return null;
  }

  return candidate as MixSegment;
}

export function normalizeDailyMix(value: unknown): DailyMix | null {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as Partial<DailyMix>;
  if (typeof candidate.dayKey !== "string" || typeof candidate.generatedAt !== "string") return null;
  if (!Array.isArray(candidate.segments) || candidate.segments.length === 0) return null;

  const segments = candidate.segments.map(normalizeMixSegment);
  if (segments.some((segment) => segment === null)) return null;

  const completedSegmentIds = Array.isArray(candidate.completedSegmentIds)
    ? candidate.completedSegmentIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    dayKey: candidate.dayKey,
    generatedAt: candidate.generatedAt,
    segments: segments as MixSegment[],
    completedSegmentIds,
  };
}

export function loadDailyMix(): DailyMix | null {
  try {
    const stored = window.localStorage.getItem(DAILY_MIX_STORAGE_KEY);
    if (!stored) return null;

    return normalizeDailyMix(JSON.parse(stored) as unknown);
  } catch {
    return null;
  }
}

export function saveDailyMix(mix: DailyMix): boolean {
  try {
    window.localStorage.setItem(DAILY_MIX_STORAGE_KEY, JSON.stringify(mix));
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
