import PianoKeyboard from "../PianoKeyboard";
import { midiToNoteId } from "../../types";

// Playing back what you heard.
//
// The notes entered so far are shown as text, not only as keyboard highlights,
// so a learner can check their answer before committing to it — and so a screen
// reader can read it back.

type EarNoteAnswerProps = {
  entered: readonly number[];
  isAnswered: boolean;
  // Key centre asks for exactly one note; the sequence families take as many as
  // were played.
  singleNote: boolean;
  onPlayNote: (noteId: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onPlayAnswer: () => void;
  onSubmit: () => void;
};

function EarNoteAnswer({
  entered,
  isAnswered,
  singleNote,
  onPlayNote,
  onUndo,
  onClear,
  onPlayAnswer,
  onSubmit,
}: EarNoteAnswerProps) {
  const noteIds = entered.map((midi) => midiToNoteId(midi));
  const isFull = singleNote && entered.length >= 1;

  return (
    <div className="ear-note-answer">
      <p className="ear-entered" aria-live="polite">
        {noteIds.length === 0 ? "Nothing entered yet." : `Your answer: ${noteIds.join(", ")}`}
      </p>

      <div className="ear-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onUndo}
          disabled={isAnswered || entered.length === 0}
        >
          Undo note
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onClear}
          disabled={isAnswered || entered.length === 0}
        >
          Clear
        </button>
        <button type="button" className="secondary-button" onClick={onPlayAnswer} disabled={entered.length === 0}>
          Hear my answer
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onSubmit}
          disabled={isAnswered || entered.length === 0}
        >
          Submit
        </button>
      </div>

      <PianoKeyboard disabled={isAnswered || isFull} onKeySelect={onPlayNote} />
    </div>
  );
}

export default EarNoteAnswer;
