import MusicStaff from "./MusicStaff";
import PianoKeyboard from "./PianoKeyboard";
import { CUSTOM_READING_NOTES } from "../noteData";
import type { PlacementOutcome, PlacementStartingPoint, PlacementState } from "../types";

// The placement check.
//
// The tone matters more than the mechanics here. This is the first thing a new
// learner meets, and it is easy to make it feel like an entrance exam. So it
// says what it is for, says it can be skipped, and never reports a result as a
// verdict — only as a place to start that the learner is free to move.

type PlacementCheckViewProps = {
  state: PlacementState;
  promptNoteId: string;
  isComplete: boolean;
  outcome: PlacementOutcome | undefined;
  startingPoint: PlacementStartingPoint | undefined;
  saved: PlacementOutcome | undefined;
  storageWarning: boolean;
  onAnswer: (noteId: string) => void;
  onRestart: () => void;
  onAccept: () => void;
  onSkip: () => void;
};

const MAX_ITEMS = 12;

function PlacementCheckView({
  state,
  promptNoteId,
  isComplete,
  outcome,
  startingPoint,
  saved,
  storageWarning,
  onAnswer,
  onRestart,
  onAccept,
  onSkip,
}: PlacementCheckViewProps) {
  const promptNote = CUSTOM_READING_NOTES.find((note) => note.id === promptNoteId);

  return (
    <section className="placement-check" aria-labelledby="placement-heading">
      <h3 id="placement-heading">Where should you start?</h3>

      {isComplete && outcome && startingPoint ? (
        <>
          <p className="placement-result">{startingPoint.summary}</p>
          <p className="placement-explanation">{outcome.explanation}</p>
          <p className="placement-caveat" role="note">
            This is a starting point from {outcome.itemsAnswered} questions, not a measurement of what you can do.
            Practice will adjust it, and you can change it yourself at any time.
          </p>
          {storageWarning ? (
            <p className="placement-explanation" role="status">
              This starting point could not be saved on this device.
            </p>
          ) : null}
          <div className="placement-actions">
            <button type="button" className="primary-button" onClick={onAccept}>
              Start here
            </button>
            <button type="button" className="secondary-button" onClick={onRestart}>
              Check again
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="placement-intro">
            A few notes to find a sensible starting point. It takes about a minute, and you can skip it — practice will
            work it out either way.
          </p>

          {promptNote ? <MusicStaff note={promptNote} /> : null}

          <p className="placement-progress" aria-live="polite">
            Question {Math.min(state.answered + 1, MAX_ITEMS)}
          </p>

          <PianoKeyboard disabled={false} onKeySelect={onAnswer} />

          <div className="placement-actions">
            <button type="button" className="secondary-button" onClick={onSkip}>
              Skip the check
            </button>
          </div>
        </>
      )}

      {saved && !isComplete ? (
        <p className="placement-explanation" role="note">
          You last placed at {saved.band} difficulty.
        </p>
      ) : null}
    </section>
  );
}

export default PlacementCheckView;
