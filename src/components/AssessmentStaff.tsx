import { getSheetNotePlacement } from "../noteData";
import { midiToNoteId, type AssessmentPassage } from "../types";

// The assessment passage as notation.
//
// Drawn from tick positions rather than from named durations, because that is
// what the passage is: the material is authored in musical time and this is a
// view of it. Notes are spaced by their onset so the picture matches the rhythm
// the learner is being asked to read, and barlines fall where the meter puts
// them.
//
// Nothing here reacts to a right or wrong answer. During an assessment the only
// thing the staff shows is where the learner has got to.

type AssessmentStaffProps = {
  passage: AssessmentPassage;
  // How many notes have been played, so the reader can see their place.
  position: number;
};

const STAFF_LINES = [56, 72, 88, 104, 120];
const VIEW_WIDTH = 900;
const STAFF_X_START = 24;
const STAFF_X_END = VIEW_WIDTH - 16;
const FIRST_NOTE_X = 92;
const LAST_NOTE_X = STAFF_X_END - 28;
const STEM_LENGTH = 46;
// Middle line: stems point up below it and down above it, per engraving custom.
const STEM_FLIP_Y = 88;

function noteX(onsetTicks: number, lengthTicks: number): number {
  const share = lengthTicks > 0 ? onsetTicks / lengthTicks : 0;
  return FIRST_NOTE_X + share * (LAST_NOTE_X - FIRST_NOTE_X);
}

function AssessmentStaff({ passage, position }: AssessmentStaffProps) {
  const barTicks = passage.lengthTicks / Math.max(1, passage.bars);

  return (
    <svg
      className="staff assessment-staff"
      viewBox={`0 0 ${VIEW_WIDTH} 184`}
      role="img"
      aria-label={`Treble staff passage, ${passage.notes.length} notes in ${passage.bars} bars`}
    >
      <text className="clef treble-clef" x="44" y="119" aria-hidden="true">
        𝄞
      </text>
      {STAFF_LINES.map((lineY) => (
        <line key={lineY} x1={STAFF_X_START} x2={STAFF_X_END} y1={lineY} y2={lineY} className="staff-line" />
      ))}

      {Array.from({ length: passage.bars + 1 }, (_, bar) => bar).map((bar) => (
        <line
          key={`bar-${bar}`}
          x1={bar === 0 ? STAFF_X_START : noteX(bar * barTicks, passage.lengthTicks) - 14}
          x2={bar === 0 ? STAFF_X_START : noteX(bar * barTicks, passage.lengthTicks) - 14}
          y1={STAFF_LINES[0]}
          y2={STAFF_LINES[STAFF_LINES.length - 1]}
          className="staff-line"
        />
      ))}

      {passage.notes.map((note, index) => {
        const noteId = midiToNoteId(note.midi);
        const placement = getSheetNotePlacement(noteId, "treble");
        if (!placement) return null;

        const x = noteX(note.onsetTicks, passage.lengthTicks);
        const stemUp = placement.staffY >= STEM_FLIP_Y;
        const state = index < position ? "done" : index === position ? "current" : "upcoming";

        return (
          <g key={`${index}-${noteId}`} className={`assessment-note ${state}`}>
            {placement.ledgerLineYs.map((ledgerY) => (
              <line key={ledgerY} x1={x - 12} x2={x + 12} y1={ledgerY} y2={ledgerY} className="staff-line" />
            ))}
            {placement.isSharp ? (
              <text className="assessment-accidental" x={x - 22} y={placement.staffY + 5} aria-hidden="true">
                ♯
              </text>
            ) : null}
            <ellipse
              cx={x}
              cy={placement.staffY}
              rx={8}
              ry={6}
              className="note-head"
              transform={`rotate(-18 ${x} ${placement.staffY})`}
            />
            <line
              x1={stemUp ? x + 7 : x - 7}
              x2={stemUp ? x + 7 : x - 7}
              y1={placement.staffY}
              y2={stemUp ? placement.staffY - STEM_LENGTH : placement.staffY + STEM_LENGTH}
              className="note-stem"
            />
          </g>
        );
      })}
    </svg>
  );
}

export default AssessmentStaff;
