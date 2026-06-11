import { SESSION_HISTORY_LIMIT } from "./practiceData";
import type { ModeProgress, PracticeDataExport, PracticeProgress, PracticeSessionRecord } from "./types";

/**
 * Merge two practice-data documents into one. Used when a signed-in device pulls
 * remote state and reconciles it with whatever it has locally.
 *
 * Strategy (MVP, intentionally simple and explainable):
 * - `bestRoundScore` takes the maximum across both (a monotonic high score).
 * - `totalAttempts`, `totalCorrect`, `sessionsCompleted`, and `settings` are
 *   last-write-wins, taken from whichever document has the newer `exportedAt`.
 * - `noteStats` keys are unioned (notes only practiced on the stale device are
 *   preserved); on key collision the newer document wins.
 * - `history` is unioned by stable `id`, deduped, sorted newest-first, and capped.
 *
 * Known limitation: concurrent offline practice on two devices can undercount the
 * lifetime counters, because counters are not deltas. Delta-based merge is future work.
 */
export function mergePracticeData(a: PracticeDataExport, b: PracticeDataExport): PracticeDataExport {
  const aIsNewer = Date.parse(a.exportedAt) >= Date.parse(b.exportedAt);
  const newer = aIsNewer ? a : b;
  const older = aIsNewer ? b : a;

  return {
    schemaVersion: 1,
    exportedAt: newer.exportedAt,
    settings: newer.settings,
    progress: {
      reading: mergeModeProgress(newer.progress.reading, older.progress.reading),
      pitch: mergeModeProgress(newer.progress.pitch, older.progress.pitch),
      history: mergeHistory(newer.progress.history, older.progress.history),
    },
  };
}

function mergeModeProgress(newer: ModeProgress, older: ModeProgress): ModeProgress {
  return {
    totalAttempts: newer.totalAttempts,
    totalCorrect: newer.totalCorrect,
    sessionsCompleted: newer.sessionsCompleted,
    bestRoundScore: Math.max(newer.bestRoundScore, older.bestRoundScore),
    noteStats: { ...older.noteStats, ...newer.noteStats },
  };
}

function mergeHistory(newer: PracticeSessionRecord[], older: PracticeSessionRecord[]): PracticeSessionRecord[] {
  const byId = new Map<string, PracticeSessionRecord>();

  for (const record of [...older, ...newer]) {
    byId.set(record.id, record);
  }

  return [...byId.values()]
    .sort((first, second) => Date.parse(second.completedAt) - Date.parse(first.completedAt))
    .slice(0, SESSION_HISTORY_LIMIT);
}

/** Merge progress only, ignoring settings; used where settings are reconciled separately. */
export function mergePracticeProgress(newer: PracticeProgress, older: PracticeProgress): PracticeProgress {
  return {
    reading: mergeModeProgress(newer.reading, older.reading),
    pitch: mergeModeProgress(newer.pitch, older.pitch),
    history: mergeHistory(newer.history, older.history),
  };
}
