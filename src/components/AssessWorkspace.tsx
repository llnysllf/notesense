import PlacementCheckView from "./PlacementCheckView";
import ReadingScoreReport from "./ReadingScoreReport";
import ReadingScoreRunner from "./ReadingScoreRunner";
import type { AssessmentView } from "../types";

// The two assessment destinations.
//
// Kept behind one lazily loaded module because neither is on the path a learner
// takes every day: practice should not pay for the assessment's weight on first
// load.

type AssessWorkspaceProps = {
  view: "placement" | "reading-score";
  assessment: AssessmentView;
  onSkipPlacement: () => void;
};

function AssessWorkspace({ view, assessment, onSkipPlacement }: AssessWorkspaceProps) {
  if (view === "placement") {
    const { placement } = assessment;
    return (
      <PlacementCheckView
        state={placement.state}
        promptNoteId={placement.promptNoteId}
        isComplete={placement.isComplete}
        outcome={placement.outcome}
        startingPoint={placement.startingPoint}
        saved={placement.saved}
        storageWarning={placement.storageWarning}
        onAnswer={placement.answer}
        onRestart={placement.restart}
        onAccept={placement.accept}
        onSkip={onSkipPlacement}
      />
    );
  }

  const { readingScore } = assessment;
  if (readingScore.status === "complete" && readingScore.result) {
    return (
      <ReadingScoreReport
        result={readingScore.result}
        latest={readingScore.latest}
        trend={readingScore.trend}
        isTrendworthy={readingScore.isTrendworthy}
        storageWarning={readingScore.storageWarning}
        onRetake={readingScore.retake}
      />
    );
  }

  return (
    <ReadingScoreRunner
      passage={readingScore.passage}
      status={readingScore.status}
      answeredCount={readingScore.answeredCount}
      isAudible={readingScore.isAudible}
      onStart={readingScore.start}
      onFinish={readingScore.finish}
      onPlay={readingScore.play}
    />
  );
}

export default AssessWorkspace;
