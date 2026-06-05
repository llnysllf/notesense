import { emptyProgress } from "./noteData";
import type {
  ModeProgress,
  NoteName,
  PitchNote,
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
export const SESSION_HISTORY_LIMIT = 20;

export const defaultSettings: PracticeSettings = {
  roundLength: 60,
  adaptivePractice: true,
  autoPlayPitch: true,
  revealPitchAfterAnswer: true,
};

type LegacyPracticeProgress = Partial<ModeProgress> & Partial<PracticeProgress>;

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "reading" || value === "pitch";
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

function normalizeModeProgress(progress: Partial<ModeProgress> | undefined, mode: PracticeMode): ModeProgress {
  const emptyModeProgress = emptyProgress[mode];

  return {
    ...emptyModeProgress,
    ...progress,
    noteStats: {
      ...emptyModeProgress.noteStats,
      ...progress?.noteStats,
    },
  };
}

function normalizeProgress(progress: LegacyPracticeProgress): PracticeProgress {
  if ("reading" in progress || "pitch" in progress) {
    return {
      reading: normalizeModeProgress(progress.reading, "reading"),
      pitch: normalizeModeProgress(progress.pitch, "pitch"),
      history: normalizeSessionHistory(progress.history),
    };
  }

  return {
    reading: normalizeModeProgress(progress, "reading"),
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

export function saveProgress(progress: PracticeProgress): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function normalizeSettings(settings: Partial<PracticeSettings>): PracticeSettings {
  const roundLength = [30, 60, 90].includes(Number(settings.roundLength))
    ? (Number(settings.roundLength) as PracticeSettings["roundLength"])
    : defaultSettings.roundLength;

  return {
    ...defaultSettings,
    ...settings,
    roundLength,
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

export function saveSettings(settings: PracticeSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
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
  saveProgress(emptyProgress);
  return emptyProgress;
}
