import {
  DEFAULT_PITCH_RANGE,
  DEFAULT_READING_RANGE,
  getPitchNotes,
  getPitchRange,
  getReadingNotes,
  getReadingRange,
} from "./noteData";
import type {
  CustomPitchRange,
  CustomReadingRange,
  DailyGoalSummary,
  MasteryItem,
  MasteryStatus,
  MasterySummary,
  ModeProgress,
  PitchNote,
  PitchRange,
  PracticeInsightSummary,
  PracticeMode,
  PracticePlan,
  PracticeProgress,
  PracticeSessionRecord,
  ReadingRange,
  RoundLength,
  SessionHistorySummary,
  SessionSummary,
  TrainingNote,
} from "./types";

export const ROUND_LENGTHS: RoundLength[] = [30, 60, 90];
export const RECENT_SESSION_LIMIT = 5;
export const TREND_SESSION_LIMIT = 6;
export const DAILY_GOAL_SESSION_TARGET = 1;
const BASELINE_ATTEMPT_TARGET = 5;
const FOCUS_ACCURACY_TARGET = 85;
const ADVANCE_ACCURACY_TARGET = 90;
const RECOVERY_DROP_THRESHOLD = -10;
const MASTERY_ATTEMPT_TARGET = 5;
const MASTERY_STRONG_ACCURACY = 90;
const MASTERY_FOCUS_ACCURACY = 70;

type CreateSessionRecordInput = Omit<PracticeSessionRecord, "id" | "completedAt" | "accuracy"> &
  Partial<Pick<PracticeSessionRecord, "id" | "completedAt">>;

type SelectNoteOptions = {
  customPitchRange?: CustomPitchRange;
  customReadingRange?: CustomReadingRange;
  pitchRange?: PitchRange;
  previousNoteId?: string;
  progress?: ModeProgress;
  readingRange?: ReadingRange;
  rng?: () => number;
  useAdaptive?: boolean;
};

type GetPracticePlanInput = {
  adaptivePractice: boolean;
  customPitchRange?: CustomPitchRange;
  customReadingRange?: CustomReadingRange;
  mode: PracticeMode;
  progress: PracticeProgress;
  pitchRange?: PitchRange;
  readingRange?: ReadingRange;
  roundLength: RoundLength;
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

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDayKey(dayKey: string, offsetDays: number): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return getDayKey(date);
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

function getPracticeSourceNotes(
  mode: PracticeMode,
  readingRange: ReadingRange = DEFAULT_READING_RANGE,
  customReadingRange?: CustomReadingRange,
  pitchRange: PitchRange = DEFAULT_PITCH_RANGE,
  customPitchRange?: CustomPitchRange,
) {
  return mode === "reading"
    ? getReadingNotes(readingRange, customReadingRange)
    : getPitchNotes(pitchRange, customPitchRange);
}

export function getFocusItems(
  mode: PracticeMode,
  modeProgress: ModeProgress,
  readingRange: ReadingRange = DEFAULT_READING_RANGE,
  customReadingRange?: CustomReadingRange,
  pitchRange: PitchRange = DEFAULT_PITCH_RANGE,
  customPitchRange?: CustomPitchRange,
) {
  const sourceNotes = getPracticeSourceNotes(mode, readingRange, customReadingRange, pitchRange, customPitchRange);

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

export function getMasteryStatus(attempts: number, accuracy: number): MasteryStatus {
  if (attempts === 0) {
    return "new";
  }

  if (accuracy < MASTERY_FOCUS_ACCURACY) {
    return "focus";
  }

  if (attempts >= MASTERY_ATTEMPT_TARGET && accuracy >= MASTERY_STRONG_ACCURACY) {
    return "strong";
  }

  return "learning";
}

export function getMasterySummary(
  mode: PracticeMode,
  modeProgress: ModeProgress,
  readingRange: ReadingRange = DEFAULT_READING_RANGE,
  customReadingRange?: CustomReadingRange,
  pitchRange: PitchRange = DEFAULT_PITCH_RANGE,
  customPitchRange?: CustomPitchRange,
): MasterySummary {
  const items: MasteryItem[] = getPracticeSourceNotes(
    mode,
    readingRange,
    customReadingRange,
    pitchRange,
    customPitchRange,
  ).map((note) => {
    const attempts = modeProgress.noteStats[note.id]?.attempts ?? 0;
    const accuracy = getNoteAccuracy(modeProgress, note.id);

    return {
      id: note.id,
      label: note.id,
      attempts,
      accuracy,
      status: getMasteryStatus(attempts, accuracy),
    };
  });

  return {
    items,
    averageAccuracy:
      modeProgress.totalAttempts > 0 ? Math.round((modeProgress.totalCorrect / modeProgress.totalAttempts) * 100) : 0,
    strongCount: items.filter((item) => item.status === "strong").length,
    totalCount: items.length,
  };
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

export function getDailyGoalSummary(
  history: PracticeSessionRecord[],
  now = new Date(),
  targetSessions = DAILY_GOAL_SESSION_TARGET,
): DailyGoalSummary {
  const todayKey = getDayKey(now);
  const safeTargetSessions = Math.max(1, clampWholeNumber(targetSessions));
  const dailySessions = new Map<string, { durationSeconds: number; sessions: number }>();

  history.forEach((session) => {
    const completedAt = new Date(session.completedAt);

    if (Number.isNaN(completedAt.getTime())) {
      return;
    }

    const dayKey = getDayKey(completedAt);
    const currentDay = dailySessions.get(dayKey) ?? { durationSeconds: 0, sessions: 0 };
    dailySessions.set(dayKey, {
      durationSeconds: currentDay.durationSeconds + session.durationSeconds,
      sessions: currentDay.sessions + 1,
    });
  });

  const completedDays = new Set(
    [...dailySessions.entries()]
      .filter(([, summary]) => summary.sessions >= safeTargetSessions)
      .map(([dayKey]) => dayKey),
  );
  const todaySummary = dailySessions.get(todayKey) ?? { durationSeconds: 0, sessions: 0 };
  const isComplete = completedDays.has(todayKey);
  const streakAnchor = isComplete ? todayKey : shiftDayKey(todayKey, -1);
  let currentStreak = 0;
  let cursor = streakAnchor;

  while (completedDays.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  const orderedCompletedDays = [...completedDays].sort();
  const bestStreak = orderedCompletedDays.reduce(
    (summary, dayKey) => {
      const currentStreak =
        summary.previousDayKey && shiftDayKey(summary.previousDayKey, 1) === dayKey ? summary.currentStreak + 1 : 1;

      return {
        bestStreak: Math.max(summary.bestStreak, currentStreak),
        currentStreak,
        previousDayKey: dayKey,
      };
    },
    { bestStreak: 0, currentStreak: 0, previousDayKey: "" },
  ).bestStreak;
  const remainingSessions = Math.max(0, safeTargetSessions - todaySummary.sessions);

  return {
    targetSessions: safeTargetSessions,
    completedSessions: todaySummary.sessions,
    completionPercent: Math.min(100, Math.round((todaySummary.sessions / safeTargetSessions) * 100)),
    isComplete,
    currentStreak,
    bestStreak,
    todayPracticeSeconds: todaySummary.durationSeconds,
    nextAction: isComplete
      ? "Goal complete. Keep the streak alive tomorrow."
      : `Finish ${remainingSessions} more round${remainingSessions === 1 ? "" : "s"} today.`,
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

export function getPracticePlan({
  adaptivePractice,
  customPitchRange,
  customReadingRange,
  mode,
  progress,
  pitchRange = DEFAULT_PITCH_RANGE,
  readingRange = DEFAULT_READING_RANGE,
  roundLength,
}: GetPracticePlanInput): PracticePlan {
  const modeLabel = getModeLabel(mode).toLowerCase();
  const modeProgress = progress[mode];
  const focusItems = getFocusItems(mode, modeProgress, readingRange, customReadingRange, pitchRange, customPitchRange);
  const weakestItem = focusItems.find((entry) => entry.accuracy < FOCUS_ACCURACY_TARGET);
  const historySummary = getSessionHistorySummary(progress.history, mode);
  const insightSummary = getPracticeInsightSummary(progress.history, mode);
  const scope =
    mode === "reading"
      ? getReadingRange(readingRange, customReadingRange).detail
      : getPitchRange(pitchRange, customPitchRange).detail;

  if (modeProgress.totalAttempts < BASELINE_ATTEMPT_TARGET) {
    const remainingAttempts = BASELINE_ATTEMPT_TARGET - modeProgress.totalAttempts;

    return {
      tone: "baseline",
      title: "Build baseline",
      focus: scope,
      reason: "A few saved answers will make the next recommendation more reliable.",
      target: `${remainingAttempts} more answer${remainingAttempts === 1 ? "" : "s"}`,
      steps: [`One ${roundLength}s ${modeLabel} round`, "At least 5 answers", "First focus area"],
    };
  }

  if (weakestItem) {
    const adaptiveStep = adaptivePractice ? "Adaptive round" : "Turn on adaptive practice";

    return {
      tone: "focus",
      title: `Focus ${weakestItem.note.id}`,
      focus: `${weakestItem.accuracy}% accuracy`,
      reason: `${weakestItem.note.id} is the weakest saved item across ${weakestItem.attempts} tries.`,
      target: `${FOCUS_ACCURACY_TARGET}% on ${weakestItem.note.id}`,
      steps: [`One ${roundLength}s ${modeLabel} round`, adaptiveStep, `Slow answers on ${weakestItem.note.id}`],
    };
  }

  if (insightSummary.trendPoints.length >= 2 && insightSummary.accuracyDelta <= RECOVERY_DROP_THRESHOLD) {
    return {
      tone: "recovery",
      title: "Stabilize accuracy",
      focus: `${insightSummary.latestAccuracy}% latest`,
      reason: `Accuracy is down ${Math.abs(insightSummary.accuracyDelta)}% from the previous saved round.`,
      target: "Back to 80%",
      steps: [`One careful ${roundLength}s round`, "Accuracy before speed", "Finish with a steady streak"],
    };
  }

  if (
    historySummary.recentSessions.length >= 3 &&
    historySummary.averageAccuracy >= ADVANCE_ACCURACY_TARGET &&
    insightSummary.latestAccuracy >= ADVANCE_ACCURACY_TARGET
  ) {
    return {
      tone: "advance",
      title: "Ready to stretch",
      focus: `${historySummary.averageAccuracy}% recent avg`,
      reason: `Recent ${modeLabel} rounds are staying above ${ADVANCE_ACCURACY_TARGET}%.`,
      target: "Hold 90% again",
      steps: [`One faster ${roundLength}s round`, "Keep the best streak steady", "Move up after another clean round"],
    };
  }

  return {
    tone: "steady",
    title: "Keep momentum",
    focus: `${formatAccuracy(modeProgress.totalCorrect, modeProgress.totalAttempts)} lifetime`,
    reason: `The current ${modeLabel} profile is balanced enough for a normal round.`,
    target: `${FOCUS_ACCURACY_TARGET}% accuracy`,
    steps: [`One ${roundLength}s ${modeLabel} round`, "Steady tempo", "Review the round summary"],
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
  const fallbackNote = notes[0];
  if (!fallbackNote) {
    throw new Error("NoteSense practice selection requires at least one note.");
  }

  const availableNotes = notes.length > 1 ? notes.filter((note) => note.id !== options.previousNoteId) : notes;
  const candidateNotes = availableNotes.length > 0 ? availableNotes : [fallbackNote];
  const rng = options.rng ?? Math.random;

  if (!options.useAdaptive) {
    return candidateNotes[Math.floor(rng() * candidateNotes.length)] ?? fallbackNote;
  }

  const weightedNotes = candidateNotes.map((note) => ({
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

  return weightedNotes.at(-1)?.note ?? fallbackNote;
}

export function selectReadingNote(options: SelectNoteOptions = {}): TrainingNote {
  return selectPracticeNote(getReadingNotes(options.readingRange, options.customReadingRange), options);
}

export function selectPitchNote(options: SelectNoteOptions = {}): PitchNote {
  return selectPracticeNote(getPitchNotes(options.pitchRange, options.customPitchRange), options);
}

export function selectPitchMelody(options: SelectNoteOptions & { length: number }): PitchNote[] {
  const length = Math.max(1, Math.round(options.length));
  const notes: PitchNote[] = [];

  for (let index = 0; index < length; index += 1) {
    const previousNoteId = notes.at(-1)?.id ?? options.previousNoteId;
    notes.push(selectPitchNote(previousNoteId === undefined ? options : { ...options, previousNoteId }));
  }

  return notes;
}

export function createSessionSummary(
  mode: PracticeMode,
  progress: PracticeProgress,
  score: number,
  attempts: number,
  bestStreak: number,
  readingRange: ReadingRange = DEFAULT_READING_RANGE,
  customReadingRange?: CustomReadingRange,
  pitchRange: PitchRange = DEFAULT_PITCH_RANGE,
  customPitchRange?: CustomPitchRange,
): SessionSummary {
  const focusItem = getFocusItems(
    mode,
    progress[mode],
    readingRange,
    customReadingRange,
    pitchRange,
    customPitchRange,
  ).find((entry) => entry.accuracy < 85)?.note.id;
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  const suggestion =
    attempts === 0
      ? "Next: start with a short round and answer at least five prompts."
      : focusItem
        ? `Next: spend one short round on ${focusItem}.`
        : "Next: keep the same range and try to beat this score.";

  const summary: SessionSummary = {
    mode,
    score,
    attempts,
    accuracy,
    bestStreak,
    suggestion,
  };

  if (focusItem !== undefined) {
    summary.focusItem = focusItem;
  }

  return summary;
}
