import { PITCH_NOTES, STARTER_NOTES } from "./noteData";
import type {
  ModeProgress,
  PitchNote,
  PracticeInsightSummary,
  PracticeMode,
  PracticeProgress,
  PracticeSessionRecord,
  RoundLength,
  SessionHistorySummary,
  SessionSummary,
  TrainingNote,
} from "./types";

export const ROUND_LENGTHS: RoundLength[] = [30, 60, 90];
export const RECENT_SESSION_LIMIT = 5;
export const TREND_SESSION_LIMIT = 6;

type CreateSessionRecordInput = Omit<PracticeSessionRecord, "id" | "completedAt" | "accuracy"> &
  Partial<Pick<PracticeSessionRecord, "id" | "completedAt">>;

type SelectNoteOptions = {
  previousNoteId?: string;
  progress?: ModeProgress;
  rng?: () => number;
  useAdaptive?: boolean;
};

export function formatAccuracy(correct: number, attempts: number): string {
  if (attempts === 0) {
    return "0%";
  }

  return `${Math.round((correct / attempts) * 100)}%`;
}

function clampWholeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function formatDuration(seconds: number): string {
  const safeSeconds = clampWholeNumber(seconds);
  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
}

export function getModeLabel(mode: PracticeMode): string {
  return mode === "reading" ? "Note reading" : "Pitch training";
}

export function getNoteAccuracy(progress: ModeProgress, noteId: string): number {
  const stat = progress.noteStats[noteId];
  if (!stat || stat.attempts === 0) {
    return 0;
  }

  return Math.round((stat.correct / stat.attempts) * 100);
}

export function getFocusItems(mode: PracticeMode, modeProgress: ModeProgress) {
  const sourceNotes = mode === "reading" ? STARTER_NOTES : PITCH_NOTES;

  return sourceNotes
    .map((note) => ({
      note,
      accuracy: getNoteAccuracy(modeProgress, note.id),
      attempts: modeProgress.noteStats[note.id]?.attempts ?? 0,
    }))
    .filter((entry) => entry.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
}

export function createSessionRecord({
  mode,
  score,
  attempts,
  bestStreak,
  durationSeconds,
  completedAt = new Date().toISOString(),
  id = `${mode}-${completedAt}`,
}: CreateSessionRecordInput): PracticeSessionRecord {
  const safeAttempts = clampWholeNumber(attempts);
  const safeScore = Math.min(safeAttempts, clampWholeNumber(score));

  return {
    id,
    mode,
    completedAt,
    durationSeconds: clampWholeNumber(durationSeconds),
    score: safeScore,
    attempts: safeAttempts,
    accuracy: safeAttempts > 0 ? Math.round((safeScore / safeAttempts) * 100) : 0,
    bestStreak: clampWholeNumber(bestStreak),
  };
}

export function getRecentSessions(
  history: PracticeSessionRecord[],
  mode: PracticeMode,
  limit = RECENT_SESSION_LIMIT,
): PracticeSessionRecord[] {
  return history.filter((session) => session.mode === mode).slice(0, limit);
}

export function getSessionHistorySummary(
  history: PracticeSessionRecord[],
  mode: PracticeMode,
  limit = RECENT_SESSION_LIMIT,
): SessionHistorySummary {
  const recentSessions = getRecentSessions(history, mode, limit);
  const totals = recentSessions.reduce(
    (summary, session) => ({
      score: summary.score + session.score,
      attempts: summary.attempts + session.attempts,
      durationSeconds: summary.durationSeconds + session.durationSeconds,
      bestStreak: Math.max(summary.bestStreak, session.bestStreak),
    }),
    { score: 0, attempts: 0, durationSeconds: 0, bestStreak: 0 },
  );

  return {
    recentSessions,
    averageAccuracy: totals.attempts > 0 ? Math.round((totals.score / totals.attempts) * 100) : 0,
    totalAttempts: totals.attempts,
    totalPracticeSeconds: totals.durationSeconds,
    bestStreak: totals.bestStreak,
  };
}

export function getPracticeInsightSummary(
  history: PracticeSessionRecord[],
  mode: PracticeMode,
  limit = TREND_SESSION_LIMIT,
): PracticeInsightSummary {
  const recentSessions = getRecentSessions(history, mode, limit);
  const latestSession = recentSessions[0];
  const previousSession = recentSessions[1];

  return {
    trendPoints: [...recentSessions].reverse().map((session, index) => ({
      id: session.id,
      label: `Round ${index + 1}`,
      completedAt: session.completedAt,
      accuracy: session.accuracy,
      score: session.score,
      attempts: session.attempts,
    })),
    latestAccuracy: latestSession?.accuracy ?? 0,
    accuracyDelta: latestSession && previousSession ? latestSession.accuracy - previousSession.accuracy : 0,
    bestStreak: recentSessions.reduce((bestStreak, session) => Math.max(bestStreak, session.bestStreak), 0),
    totalPracticeSeconds: recentSessions.reduce(
      (totalPracticeSeconds, session) => totalPracticeSeconds + session.durationSeconds,
      0,
    ),
  };
}

export function getPracticeWeight(noteId: string, progress?: ModeProgress): number {
  const stat = progress?.noteStats[noteId];
  if (!stat || stat.attempts === 0) {
    return 4;
  }

  const misses = stat.attempts - stat.correct;
  const accuracy = stat.correct / stat.attempts;
  return 1 + (1 - accuracy) * 5 + Math.min(misses, 5) * 0.4;
}

function selectPracticeNote<TNote extends { id: string }>(notes: TNote[], options: SelectNoteOptions): TNote {
  const availableNotes = notes.length > 1 ? notes.filter((note) => note.id !== options.previousNoteId) : notes;
  const rng = options.rng ?? Math.random;

  if (!options.useAdaptive) {
    return availableNotes[Math.floor(rng() * availableNotes.length)];
  }

  const weightedNotes = availableNotes.map((note) => ({
    note,
    weight: getPracticeWeight(note.id, options.progress),
  }));
  const totalWeight = weightedNotes.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * totalWeight;

  for (const entry of weightedNotes) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.note;
    }
  }

  return weightedNotes[weightedNotes.length - 1].note;
}

export function selectReadingNote(options: SelectNoteOptions = {}): TrainingNote {
  return selectPracticeNote(STARTER_NOTES, options);
}

export function selectPitchNote(options: SelectNoteOptions = {}): PitchNote {
  return selectPracticeNote(PITCH_NOTES, options);
}

export function createSessionSummary(
  mode: PracticeMode,
  progress: PracticeProgress,
  score: number,
  attempts: number,
  bestStreak: number,
): SessionSummary {
  const focusItem = getFocusItems(mode, progress[mode]).find((entry) => entry.accuracy < 85)?.note.id;
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  const suggestion =
    attempts === 0
      ? "Next: start with a short round and answer at least five prompts."
      : focusItem
        ? `Next: spend one short round on ${focusItem}.`
        : "Next: keep the same range and try to beat this score.";

  return {
    mode,
    score,
    attempts,
    accuracy,
    bestStreak,
    focusItem,
    suggestion,
  };
}
