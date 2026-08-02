// The learner's own Reading Score history.
//
// Kept apart from the practice evidence ledger on purpose: an assessment is a
// measurement, not a practice attempt, and letting test material feed adaptive
// repetition would mean the next test was no longer unseen.

import { useCallback, useState } from "react";
import { loadReadingScores, saveReadingScores } from "../storage";
import {
  appendReadingScore,
  createReadingScoreRecord,
  isTrendworthy,
  readingScoreTrend,
  type AssessmentPassage,
  type AttemptInputSource,
  type ReadingScoreRecord,
  type ReadingScoreResult,
  type ReadingScoreTrend,
} from "../types";

export type UseReadingScoreHistory = {
  history: ReadingScoreRecord[];
  latest: ReadingScoreRecord | undefined;
  trend: ReadingScoreTrend;
  storageWarning: boolean;
  record: (result: ReadingScoreResult, passage: AssessmentPassage, inputSource: AttemptInputSource) => void;
};

export function useReadingScoreHistory(): UseReadingScoreHistory {
  const [history, setHistory] = useState<ReadingScoreRecord[]>(() => loadReadingScores());
  const [storageWarning, setStorageWarning] = useState(false);

  const record = useCallback(
    (result: ReadingScoreResult, passage: AssessmentPassage, inputSource: AttemptInputSource) => {
      // A run too thin to trust is still shown to the learner, but it is not
      // allowed to move the trend line — a number built on three notes is not
      // evidence that anything changed.
      if (!isTrendworthy(result)) return;

      const next = appendReadingScore(
        history,
        createReadingScoreRecord({
          // Wall-clock alone is not unique: two sittings can land in the same
          // millisecond, and history is deduplicated by id, so a real result
          // would be silently dropped. The performance clock breaks the tie.
          id: `${Date.now()}-${Math.round(performance.now() * 1000)}`,
          recordedAtIso: new Date().toISOString(),
          passage,
          result,
          inputSource,
        }),
      );
      setHistory(next);
      if (!saveReadingScores(next)) setStorageWarning(true);
    },
    [history],
  );

  return {
    history,
    latest: history[0],
    trend: readingScoreTrend(history),
    storageWarning,
    record,
  };
}
