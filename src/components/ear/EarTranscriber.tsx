import PianoKeyboard from "../PianoKeyboard";
import { getSheetNotePlacement } from "../../noteData";
import { midiToNoteId, noteIdToMidi, type SequenceComparison, type TranscriberView } from "../../types";

// Writing down what you heard.
//
// Entry is slot-then-pitch: pick where the note goes, then play it. That order
// is what makes the editor reachable without a mouse — every slot is a button,
// and once one is selected the arrow keys move the note by step or by beat.
// Dragging note heads would look better and would be unusable on a phone and
// with a keyboard, which is most of the people this exercise is for.

type EarTranscriberProps = {
  transcriber: TranscriberView;
  slots: readonly number[];
  isAnswered: boolean;
  comparison: SequenceComparison | undefined;
  onPlayAnswer: () => void;
  onSubmit: () => void;
};

const STAFF_LINES = [56, 72, 88, 104, 120];
const VIEW_WIDTH = 720;
const FIRST_X = 90;
const LAST_X = VIEW_WIDTH - 40;

// Which entered notes the feedback says are wrong, by position.
function wrongPositions(comparison: SequenceComparison | undefined): Set<number> {
  if (!comparison) return new Set();
  const wrong = new Set<number>();
  let entered = 0;
  for (const step of comparison.steps) {
    if (step.kind === "correct") entered += 1;
    else if (step.kind === "wrong" || step.kind === "extra") {
      wrong.add(entered);
      entered += 1;
    }
  }
  return wrong;
}

function EarTranscriber({ transcriber, slots, isAnswered, comparison, onPlayAnswer, onSubmit }: EarTranscriberProps) {
  const { notes, selected } = transcriber;
  const wrong = wrongPositions(comparison);
  const slotX = (index: number) =>
    slots.length <= 1 ? FIRST_X : FIRST_X + (index / (slots.length - 1)) * (LAST_X - FIRST_X);

  // Editing happens from the position buttons themselves: they are already the
  // focus target, so the arrow keys act where the learner's attention is.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (selected === null) return;
    const moves: Record<string, () => void> = {
      ArrowUp: () => transcriber.nudgePitch(1),
      ArrowDown: () => transcriber.nudgePitch(-1),
      ArrowRight: () => transcriber.nudgeOnset(1),
      ArrowLeft: () => transcriber.nudgeOnset(-1),
      Delete: () => transcriber.removeAt(selected),
      Backspace: () => transcriber.removeAt(selected),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  return (
    <div className="ear-transcriber">
      <svg
        className="staff ear-transcriber-staff"
        viewBox={`0 0 ${VIEW_WIDTH} 184`}
        role="img"
        aria-label={
          notes.length === 0
            ? "Empty staff, no notes written yet"
            : `Your transcription: ${notes.map((note) => midiToNoteId(note.midi)).join(", ")}`
        }
      >
        <text className="clef treble-clef" x="40" y="119" aria-hidden="true">
          𝄞
        </text>
        {STAFF_LINES.map((lineY) => (
          <line key={lineY} x1="20" x2={VIEW_WIDTH - 16} y1={lineY} y2={lineY} className="staff-line" />
        ))}

        {notes.map((note, index) => {
          const placement = getSheetNotePlacement(midiToNoteId(note.midi), "treble");
          if (!placement) return null;
          const slotIndex = slots.indexOf(note.onsetTicks);
          const x = slotX(slotIndex < 0 ? index : slotIndex);
          const state = wrong.has(index) ? "wrong" : comparison ? "correct" : "";

          return (
            <g key={`${note.onsetTicks}-${note.midi}`} className={`ear-written-note ${state}`}>
              {placement.ledgerLineYs.map((ledgerY) => (
                <line key={ledgerY} x1={x - 12} x2={x + 12} y1={ledgerY} y2={ledgerY} className="staff-line" />
              ))}
              <ellipse cx={x} cy={placement.staffY} rx={8} ry={6} className="note-head" />
              {index === selected ? (
                <circle cx={x} cy={placement.staffY} r={14} className="ear-note-selection" />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="ear-slots" role="group" aria-label="Where each note goes">
        {slots.map((onsetTicks, index) => {
          const note = notes.find((entry) => entry.onsetTicks === onsetTicks);
          const noteIndex = note ? notes.indexOf(note) : -1;
          const label = note ? `Position ${index + 1}, ${midiToNoteId(note.midi)}` : `Position ${index + 1}, empty`;

          return (
            <button
              key={onsetTicks}
              type="button"
              className={`chip-button${noteIndex === selected ? " ear-slot-selected" : ""}`}
              aria-pressed={noteIndex === selected}
              aria-label={label}
              disabled={isAnswered}
              onClick={() => transcriber.select(noteIndex === -1 ? null : noteIndex)}
              onKeyDown={handleKeyDown}
            >
              {note ? midiToNoteId(note.midi) : index + 1}
            </button>
          );
        })}
      </div>

      <p className="ear-hint">
        Pick a position, then play the note. With a position selected, the arrow keys move it by a semitone or a beat,
        and Delete removes it.
      </p>

      <div className="ear-actions">
        <button type="button" className="secondary-button" onClick={transcriber.undo} disabled={!transcriber.canUndo}>
          Undo
        </button>
        <button type="button" className="secondary-button" onClick={transcriber.redo} disabled={!transcriber.canRedo}>
          Redo
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => (selected === null ? undefined : transcriber.removeAt(selected))}
          disabled={isAnswered || selected === null}
        >
          Delete note
        </button>
        <button type="button" className="secondary-button" onClick={onPlayAnswer} disabled={notes.length === 0}>
          Hear my answer
        </button>
        <button type="button" className="primary-button" onClick={onSubmit} disabled={isAnswered || notes.length === 0}>
          Submit
        </button>
      </div>

      <PianoKeyboard
        disabled={isAnswered}
        onKeySelect={(noteId) => {
          const midi = noteIdToMidi(noteId);
          if (midi === undefined) return;
          // Write into the selected position, or into the first free one, so a
          // learner can simply play the phrase through without aiming.
          const selectedOnset = selected === null ? undefined : notes[selected]?.onsetTicks;
          const target = selectedOnset ?? slots.find((onset) => !notes.some((note) => note.onsetTicks === onset));
          if (target === undefined) return;
          transcriber.place(target, midi);
        }}
      />
    </div>
  );
}

export default EarTranscriber;
