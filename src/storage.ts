import { emptyProgress } from "./noteData";
import type { NoteName, PracticeProgress, TrainingNote } from "./types";

const STORAGE_KEY = "notesense.progress.v1";

function normalizeProgress(progress: Partial<PracticeProgress>): PracticeProgress {
  return {
    ...emptyProgress,
    ...progress,
    noteStats: {
      ...emptyProgress.noteStats,
      ...progress.noteStats,
    },
  };
}

export function loadProgress(): PracticeProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
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

export function recordAttempt(
  progress: PracticeProgress,
  note: TrainingNote,
  answer: NoteName,
): PracticeProgress {
  const isCorrect = answer === note.name;
  const currentNoteStats = progress.noteStats[note.id] ?? { attempts: 0, correct: 0 };

  return {
    ...progress,
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect: progress.totalCorrect + (isCorrect ? 1 : 0),
    noteStats: {
      ...progress.noteStats,
      [note.id]: {
        attempts: currentNoteStats.attempts + 1,
        correct: currentNoteStats.correct + (isCorrect ? 1 : 0),
      },
    },
  };
}

export function resetProgress(): PracticeProgress {
  saveProgress(emptyProgress);
  return emptyProgress;
}
