import type { FeedbackState, PitchNote } from "../types";

type MelodyAnswerProps = {
  answerNoteIds: string[];
  feedback: FeedbackState;
  notes: PitchNote[];
  reveal: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onUndo: () => void;
};

function MelodyAnswer({ answerNoteIds, feedback, notes, reveal, onClear, onSubmit, onUndo }: MelodyAnswerProps) {
  return (
    <div className="melody-answer" aria-label="Melody answer">
      <div className="melody-answer-heading">
        <span>Your notes</span>
        <strong>
          {answerNoteIds.length}/{notes.length}
        </strong>
      </div>

      <ol className="melody-slots" aria-live="polite">
        {notes.map((note, index) => {
          const answer = answerNoteIds[index];
          const showPositionResult = feedback !== null && (feedback.isCorrect || reveal);
          const resultClass = showPositionResult ? (answer === note.id ? "correct" : "wrong") : "";

          return (
            <li
              className={`${answer === undefined ? "empty" : "filled"} ${resultClass}`}
              key={`${note.id}-${index}`}
              aria-label={`Note ${index + 1}: ${answer ?? "empty"}`}
            >
              {answer ?? index + 1}
            </li>
          );
        })}
      </ol>

      <div className="melody-edit-actions">
        <button
          type="button"
          className="ghost-button"
          disabled={feedback !== null || answerNoteIds.length === 0}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="ghost-button"
          disabled={feedback !== null || answerNoteIds.length === 0}
          onClick={onClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={feedback !== null || answerNoteIds.length !== notes.length}
          onClick={onSubmit}
        >
          Submit melody
        </button>
      </div>
    </div>
  );
}

export default MelodyAnswer;
