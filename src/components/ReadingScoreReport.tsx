import { useRef } from "react";
import { drawShareCard, downloadShareCard } from "../shareCardImage";
import {
  buildShareCard,
  describeReadingScore,
  shareCardAltText,
  type ReadingScoreRecord,
  type ReadingScoreResult,
  type ReadingScoreTrend,
} from "../types";

// The result of one sitting.
//
// The components are shown next to the overall number rather than behind it,
// because the overall number is the least actionable thing on the screen. And
// the result says "provisional" in plain words: this algorithm has not been
// calibrated against anything, and a learner deserves to know that before they
// attach meaning to it.

type ReadingScoreReportProps = {
  result: ReadingScoreResult;
  latest: ReadingScoreRecord | undefined;
  trend: ReadingScoreTrend;
  isTrendworthy: boolean;
  storageWarning: boolean;
  onRetake: () => void;
};

const COMPONENT_LABELS = [
  ["noteAccuracy", "Notes", "Did you play the pitches that were written."],
  ["rhythmAccuracy", "Rhythm", "Did the notes land where the beat put them."],
  ["continuity", "Continuity", "Did you keep going instead of stopping to work notes out."],
  ["fluency", "Fluency", "Did you read at something like the written tempo."],
] as const;

function ReadingScoreReport({
  result,
  latest,
  trend,
  isTrendworthy,
  storageWarning,
  onRetake,
}: ReadingScoreReportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const card = latest
    ? buildShareCard(latest)
    : buildShareCard({
        score: result.score,
        band: "intro",
        components: result.components,
        recordedAtIso: new Date().toISOString(),
        isProvisional: result.isProvisional,
        inputSource: "unknown",
      });

  const handleShare = () => {
    const canvas = canvasRef.current;
    if (!canvas || !drawShareCard(canvas, card)) return;
    downloadShareCard(canvas, `notesense-reading-score-${card.dateText}.png`);
  };

  return (
    <section className="reading-score-report" aria-labelledby="reading-score-result-heading">
      <h3 id="reading-score-result-heading">Your Reading Score</h3>

      <p className="reading-score-value" aria-label={`Reading Score ${result.score} out of 100`}>
        {result.score}
      </p>

      {result.isProvisional ? (
        <p className="reading-score-caveat" role="note">
          Provisional. This score compares you to your own earlier attempts — it is not a standardized measure, and it
          should not be read as one.
        </p>
      ) : null}

      <p className="reading-score-summary">{describeReadingScore(result)}</p>

      <dl className="reading-score-components">
        {COMPONENT_LABELS.map(([key, label, explanation]) => (
          <div key={key} className="reading-score-component">
            <dt>{label}</dt>
            <dd>
              <span className="reading-score-component-value">{Math.round(result.components[key] * 100)}%</span>
              <span className="reading-score-component-note">{explanation}</span>
            </dd>
          </div>
        ))}
      </dl>

      {isTrendworthy ? (
        <p className="reading-score-trend">{trend.label}</p>
      ) : (
        <p className="reading-score-trend" role="note">
          You stopped before enough of the passage to compare this to anything, so it has not been added to your
          history.
        </p>
      )}

      {storageWarning ? (
        <p className="reading-score-trend" role="status">
          This result could not be saved on this device.
        </p>
      ) : null}

      <div className="reading-score-actions">
        <button type="button" className="secondary-button" onClick={onRetake}>
          Take another
        </button>
        <button type="button" className="secondary-button" onClick={handleShare} disabled={!isTrendworthy}>
          Save a share card
        </button>
      </div>

      {/* Drawn on demand and never uploaded; the canvas exists only to make a file. */}
      <canvas ref={canvasRef} className="visually-hidden" aria-label={shareCardAltText(card)} />
    </section>
  );
}

export default ReadingScoreReport;
