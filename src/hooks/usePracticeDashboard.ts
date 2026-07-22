import { useMemo } from "react";
import { getPitchRange, getReadingRange, normalizeCustomPitchRange, normalizeCustomReadingRange } from "../noteData";
import {
  formatAccuracy,
  getDailyGoalSummary,
  getFocusItems,
  getMasterySummary,
  getModeLabel,
  getPracticeInsightSummary,
  getPracticePlan,
  getSessionHistorySummary,
} from "../practiceEngine";
import type { PracticeMode, PracticeProgress, PracticeSettings } from "../types";

type UsePracticeDashboardOptions = {
  mode: PracticeMode;
  progress: PracticeProgress;
  settings: PracticeSettings;
  roundAttempts: number;
  roundCorrect: number;
};

export function usePracticeDashboard({
  mode,
  progress,
  settings,
  roundAttempts,
  roundCorrect,
}: UsePracticeDashboardOptions) {
  const activeProgress = progress[mode];
  const normalizedCustomRange = useMemo(
    () => normalizeCustomReadingRange(settings.customReadingRange),
    [settings.customReadingRange],
  );
  const readingRange = useMemo(
    () => getReadingRange(settings.readingRange, normalizedCustomRange),
    [normalizedCustomRange, settings.readingRange],
  );
  const normalizedCustomPitchRange = useMemo(
    () => normalizeCustomPitchRange(settings.customPitchRange),
    [settings.customPitchRange],
  );
  const pitchRange = useMemo(
    () => getPitchRange(settings.pitchRange, normalizedCustomPitchRange),
    [normalizedCustomPitchRange, settings.pitchRange],
  );
  const pitchRangeNoteIds = useMemo(() => new Set(pitchRange.notes.map((note) => note.id)), [pitchRange.notes]);
  const focusItems = useMemo(
    () =>
      getFocusItems(
        mode,
        progress[mode],
        settings.readingRange,
        normalizedCustomRange,
        settings.pitchRange,
        normalizedCustomPitchRange,
      ),
    [mode, normalizedCustomPitchRange, normalizedCustomRange, progress, settings.pitchRange, settings.readingRange],
  );
  const masterySummary = useMemo(
    () =>
      getMasterySummary(
        mode,
        progress[mode],
        settings.readingRange,
        normalizedCustomRange,
        settings.pitchRange,
        normalizedCustomPitchRange,
      ),
    [mode, normalizedCustomPitchRange, normalizedCustomRange, progress, settings.pitchRange, settings.readingRange],
  );
  const dailyGoalSummary = useMemo(() => getDailyGoalSummary(progress.history), [progress.history]);
  const historySummary = useMemo(() => getSessionHistorySummary(progress.history, mode), [mode, progress.history]);
  const insightSummary = useMemo(() => getPracticeInsightSummary(progress.history, mode), [mode, progress.history]);
  const practicePlan = useMemo(
    () =>
      getPracticePlan({
        adaptivePractice: settings.adaptivePractice,
        customPitchRange: normalizedCustomPitchRange,
        customReadingRange: normalizedCustomRange,
        mode,
        progress,
        pitchRange: settings.pitchRange,
        readingRange: settings.readingRange,
        roundLength: settings.roundLength,
      }),
    [
      mode,
      normalizedCustomPitchRange,
      normalizedCustomRange,
      progress,
      settings.adaptivePractice,
      settings.pitchRange,
      settings.readingRange,
      settings.roundLength,
    ],
  );

  return {
    activeProgress,
    dailyGoalSummary,
    focusItems,
    historySummary,
    insightSummary,
    lifetimeAccuracy: formatAccuracy(activeProgress.totalCorrect, activeProgress.totalAttempts),
    masterySummary,
    modeLabel: getModeLabel(mode),
    normalizedCustomPitchRange,
    normalizedCustomRange,
    pitchRange,
    pitchRangeNoteIds,
    practicePlan,
    promptDetail: `${settings.adaptivePractice ? "Adaptive" : "Random"} | ${
      mode === "reading" ? readingRange.detail : pitchRange.detail
    }`,
    readingRange,
    roundAccuracy: formatAccuracy(roundCorrect, roundAttempts),
  };
}
