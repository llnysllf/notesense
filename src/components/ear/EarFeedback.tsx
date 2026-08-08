import { midiToNoteId, type EarResult } from "../../types";

// What the answer earned, and what to fix.
//
// The headline is the specific thing that went wrong, not the percentage. A
// learner who is told "note 3 was a semitone low" can go and fix it; one who is
// told "67%" can only try again and hope.

type EarFeedbackProps = {
  result: EarResult;
  onNext: () => void;
};

function EarFeedback({ result, onNext }: EarFeedbackProps) {
  const comparison = result.comparison;

  return (
    <section className="ear-feedback" aria-labelledby="ear-feedback-heading" aria-live="polite">
      <h4 id="ear-feedback-heading">{result.correct ? "Correct" : "Not quite"}</h4>

      <p className="ear-feedback-summary">{result.summary}</p>

      {comparison && comparison.expectedCount > 0 ? (
        <>
          <p className="ear-feedback-detail">
            {comparison.correctCount} of {comparison.expectedCount} notes, in order.
          </p>
          <ol className="ear-feedback-notes">
            {comparison.steps.map((step, index) => (
              <li key={index} className={`ear-step ear-step-${step.kind}`}>
                {step.kind === "correct" ? (
                  <span>
                    Note {step.expectedIndex + 1}: {midiToNoteId(step.midi)} — right
                  </span>
                ) : step.kind === "wrong" ? (
                  <span>
                    Note {step.expectedIndex + 1}: you played {midiToNoteId(step.playedMidi)}, it was{" "}
                    {midiToNoteId(step.expectedMidi)}
                  </span>
                ) : step.kind === "missing" ? (
                  <span>
                    Note {step.expectedIndex + 1}: {midiToNoteId(step.expectedMidi)} — missing
                  </span>
                ) : (
                  <span>
                    Extra note {midiToNoteId(step.playedMidi)} after note {step.afterIndex + 1}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {result.transcription ? (
        <p className="ear-feedback-detail">
          Rhythm: {Math.round(result.transcription.rhythmAccuracy * 100)}% of the notes you wrote are on the right beat.
        </p>
      ) : null}

      {result.rhythm ? (
        <p className="ear-feedback-detail">
          {result.rhythm.onTime} of {result.rhythm.expectedCount} taps landed in time.
        </p>
      ) : null}

      <div className="ear-actions">
        <button type="button" className="primary-button" onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  );
}

export default EarFeedback;
