import type { SungScore } from "../../types";

// How the take went.
//
// The components are named the way a teacher would name them, and tone quality
// is not among them. What a voice sounds like is not something this app grades.

type SingingResultProps = {
  score: SungScore;
  feedback: string;
  onNext: () => void;
};

const COMPONENT_LABELS = [
  ["pitchCentre", "Pitch", "Did the notes sit where they were written."],
  ["pitchStability", "Steadiness", "Did the pitch hold while you sustained it."],
  ["transitions", "Moves", "Did you arrive at each new note."],
  ["rhythm", "Timing", "Did the notes start when they were written."],
  ["completion", "Completion", "How much of the phrase you sang."],
] as const;

function SingingResult({ score, feedback, onNext }: SingingResultProps) {
  return (
    <section className="singing-result" aria-labelledby="singing-result-heading" aria-live="polite">
      <h4 id="singing-result-heading">{score.summary.inTune ? "In tune" : "Not quite in tune"}</h4>

      <p className="singing-feedback">{feedback}</p>

      <p className="singing-cents">
        {Math.abs(Math.round(score.summary.centsError))} cents {score.summary.centsError < 0 ? "flat" : "sharp"} on
        average.
      </p>

      <dl className="singing-components">
        {COMPONENT_LABELS.map(([key, label, explanation]) => (
          <div key={key} className="singing-component">
            <dt>{label}</dt>
            <dd>
              <span className="singing-component-value">{Math.round(score.components[key] * 100)}%</span>
              <span className="singing-component-note">{explanation}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="singing-note" role="note">
        Nothing was recorded. These numbers are all that is kept.
      </p>

      <div className="singing-actions">
        <button type="button" className="primary-button" onClick={onNext}>
          Try another
        </button>
      </div>
    </section>
  );
}

export default SingingResult;
