import AssessmentStaff from "./AssessmentStaff";
import PianoKeyboard from "./PianoKeyboard";
import type { AssessmentPassage, ReadingScoreRunStatus } from "../types";

// Taking the assessment.
//
// The screen deliberately gives nothing away while the passage is running: no
// right/wrong colouring, no reveal, no hints. Those are practice affordances,
// and a test that offers them measures the affordances instead of the reading.
// What it does show is where the learner has got to, and a way to stop.

type ReadingScoreRunnerProps = {
  passage: AssessmentPassage;
  status: ReadingScoreRunStatus;
  answeredCount: number;
  isAudible: boolean;
  onStart: () => void;
  onFinish: () => void;
  onPlay: (noteId: string) => void;
};

const BAND_LABELS: Record<string, string> = {
  intro: "Intro",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function ReadingScoreRunner({
  passage,
  status,
  answeredCount,
  isAudible,
  onStart,
  onFinish,
  onPlay,
}: ReadingScoreRunnerProps) {
  const isLive = status === "running";

  return (
    <section className="reading-score-runner" aria-labelledby="reading-score-heading">
      <h3 id="reading-score-heading">Reading Score</h3>

      <p className="reading-score-context">
        {BAND_LABELS[passage.band] ?? passage.band} difficulty · {passage.bars} bars at {passage.bpm} bpm ·{" "}
        {passage.notes.length} notes
      </p>

      <p className="reading-score-rules" role="note">
        A passage you have not seen before. Play it once, straight through — nothing is marked while you play, and there
        is no going back to fix a note.
      </p>

      <AssessmentStaff passage={passage} position={isLive ? answeredCount : 0} />

      <p className="reading-score-status" aria-live="polite">
        {status === "idle"
          ? "Ready when you are."
          : status === "count-in"
            ? isAudible
              ? "Counting you in…"
              : "Counting you in — audio is unavailable, so the count-in is silent."
            : status === "running"
              ? `Note ${Math.min(answeredCount + 1, passage.notes.length)} of ${passage.notes.length}`
              : "Finished."}
      </p>

      <div className="reading-score-actions">
        {status === "idle" ? (
          <button type="button" className="primary-button" onClick={onStart}>
            Start the assessment
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={onFinish} disabled={status === "complete"}>
            Stop here
          </button>
        )}
      </div>

      <PianoKeyboard disabled={!isLive} onKeySelect={onPlay} />
    </section>
  );
}

export default ReadingScoreRunner;
