import { emptyProgress } from "./noteData";
import type { ModeProgress, NoteName, PitchNote, PracticeMode, PracticeProgress, ReadingNoteName, TrainingNote } from "./types";

const STORAGE_KEY = "notesense.progress.v2";
const LEGACY_STORAGE_KEY = "notesense.progress.v1";

type LegacyPracticeProgress = Partial<ModeProgress> & Partial<PracticeProgress>;

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
    };
  }

  return {
    reading: normalizeModeProgress(progress, "reading"),
    pitch: normalizeModeProgress(undefined, "pitch"),
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

export function completeRound(progress: PracticeProgress, mode: PracticeMode, roundCorrect: number): PracticeProgress {
  const modeProgress = progress[mode];

  return {
    ...progress,
    [mode]: {
      ...modeProgress,
      bestRoundScore: Math.max(modeProgress.bestRoundScore, roundCorrect),
      sessionsCompleted: modeProgress.sessionsCompleted + 1,
    },
  };
}

export function resetProgress(): PracticeProgress {
  saveProgress(emptyProgress);
  return emptyProgress;
}
