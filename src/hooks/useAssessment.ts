// Everything the assessment screens need, wired in one place.
//
// Placement and the Reading Score are separate screens but one feature: the
// placement result is what the assessment opens at, so a learner is tested on
// material at roughly their own level instead of at an arbitrary default.

import { useCallback } from "react";
import { usePlacementCheck } from "./usePlacementCheck";
import { useReadingScoreHistory } from "./useReadingScoreHistory";
import { useReadingScoreRun } from "./useReadingScoreRun";
import { isTrendworthy, type AssessmentView, type AttemptInputSource } from "../types";

// Where the assessment starts when nothing has been placed yet: comfortably
// inside the easy band, so a first sitting is readable rather than punishing.
const DEFAULT_DIFFICULTY = 0.35;

export type UseAssessmentOptions = {
  inputSource: AttemptInputSource;
  latencyMs?: number;
};

export function useAssessment({ inputSource, latencyMs = 0 }: UseAssessmentOptions): AssessmentView {
  const placement = usePlacementCheck();
  const history = useReadingScoreHistory();

  const onComplete = useCallback(
    (result: Parameters<typeof history.record>[0], passage: Parameters<typeof history.record>[1]) => {
      history.record(result, passage, inputSource);
    },
    [history, inputSource],
  );

  const run = useReadingScoreRun({
    difficulty: placement.saved?.difficulty ?? DEFAULT_DIFFICULTY,
    latencyMs,
    onComplete,
  });

  return {
    placement,
    readingScore: {
      passage: run.passage,
      status: run.status,
      answeredCount: run.answeredCount,
      result: run.result,
      isAudible: run.isAudible,
      isTrendworthy: run.result !== null && isTrendworthy(run.result),
      latest: history.latest,
      trend: history.trend,
      storageWarning: history.storageWarning,
      start: run.start,
      finish: run.finish,
      play: run.play,
      retake: run.nextForm,
    },
  };
}
