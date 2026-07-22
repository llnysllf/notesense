import { getPianoKeyById, getSheetNotePlacement } from "../noteData";
import type { FeedbackState, PitchNote, StaffClef } from "../types";

type PitchSequenceAnswerProps = {
  answerNoteIds: string[];
  feedback: FeedbackState;
  notes: PitchNote[];
  reveal: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onUndo: () => void;
};

const NOTES_PER_SYSTEM = 8;
const STAFF_WIDTH = 800;
const SYSTEM_HEIGHT = 238;
const SLOT_START_X = 126;
const SLOT_SPACING = 82;
const TREBLE_LINE_YS = [34, 50, 66, 82, 98];
const BASS_LINE_YS = [134, 150, 166, 182, 198];
const TREBLE_PLACEMENT_OFFSET = -22;
const BASS_PLACEMENT_OFFSET = 78;
const HEAD_RX = 10;
const HEAD_RY = 7;

type WrittenPlacement = {
  clef: StaffClef;
  ledgerLineYs: number[];
  marker: string;
  staffY: number;
  isSharp: boolean;
};

function getWrittenPlacement(noteId: string): WrittenPlacement | null {
  const key = getPianoKeyById(noteId);
  if (!key) return null;

  const clef: StaffClef = key.midi >= 60 ? "treble" : "bass";
  let writtenOctave = key.octave;
  let octaveShift = 0;

  while (clef === "treble" && writtenOctave > 5) {
    writtenOctave -= 1;
    octaveShift += 1;
  }
  while (clef === "bass" && writtenOctave < 2) {
    writtenOctave += 1;
    octaveShift -= 1;
  }

  const placement = getSheetNotePlacement(`${key.name}${writtenOctave}`, clef);
  if (!placement) return null;

  const placementOffset = clef === "treble" ? TREBLE_PLACEMENT_OFFSET : BASS_PLACEMENT_OFFSET;
  const octaveDistance = Math.abs(octaveShift);
  const marker = octaveDistance === 0 ? "" : `${8 + (octaveDistance - 1) * 7}m${octaveShift > 0 ? "a" : "b"}`;

  return {
    clef,
    ledgerLineYs: placement.ledgerLineYs.map((lineY) => lineY + placementOffset),
    marker,
    staffY: placement.staffY + placementOffset,
    isSharp: placement.isSharp,
  };
}

function WrittenNote({
  className,
  noteId,
  systemY,
  x,
}: {
  className: string;
  noteId: string;
  systemY: number;
  x: number;
}) {
  const placement = getWrittenPlacement(noteId);
  if (!placement) return null;

  const y = systemY + placement.staffY;
  const middleLineY = systemY + (placement.clef === "treble" ? TREBLE_LINE_YS[2]! : BASS_LINE_YS[2]!);
  const stemUp = y >= middleLineY;
  const stemX = stemUp ? x + HEAD_RX - 1 : x - HEAD_RX + 1;
  const stemEndY = y + (stemUp ? -42 : 42);

  return (
    <g className={className} data-note-id={noteId}>
      {placement.ledgerLineYs.map((ledgerY) => (
        <line
          className="staff-line"
          key={ledgerY}
          x1={x - 16}
          x2={x + 16}
          y1={systemY + ledgerY}
          y2={systemY + ledgerY}
        />
      ))}
      {placement.isSharp && (
        <text className="sequence-accidental" x={x - 25} y={y + 6} aria-hidden="true">
          #
        </text>
      )}
      <ellipse
        className="note-head sequence-note-head"
        cx={x}
        cy={y}
        rx={HEAD_RX}
        ry={HEAD_RY}
        transform={`rotate(-18 ${x} ${y})`}
      />
      <line className="note-stem sequence-note-stem" x1={stemX} x2={stemX} y1={y} y2={stemEndY} />
      {placement.marker && (
        <text className="sequence-octave-marker" x={x} y={y + (stemUp ? 20 : -16)} aria-hidden="true">
          {placement.marker}
        </text>
      )}
    </g>
  );
}

function PitchSequenceAnswer({
  answerNoteIds,
  feedback,
  notes,
  reveal,
  onClear,
  onSubmit,
  onUndo,
}: PitchSequenceAnswerProps) {
  const systemCount = Math.max(1, Math.ceil(notes.length / NOTES_PER_SYSTEM));
  const transcript = answerNoteIds.length > 0 ? answerNoteIds.join(", ") : "empty";
  const staffLabel = `Pitch sequence answer, ${answerNoteIds.length} of ${notes.length} notes entered. ${transcript}`;

  return (
    <div className="sequence-answer" aria-label="Pitch sequence answer">
      <div className="custom-range-heading sequence-answer-heading">
        <span>Your transcription</span>
        <strong>
          {answerNoteIds.length}/{notes.length}
        </strong>
      </div>

      <svg
        className="sequence-answer-staff"
        viewBox={`0 0 ${STAFF_WIDTH} ${systemCount * SYSTEM_HEIGHT}`}
        role="img"
        aria-label={staffLabel}
      >
        {Array.from({ length: systemCount }, (_, systemIndex) => {
          const systemY = systemIndex * SYSTEM_HEIGHT;
          return (
            <g key={systemIndex} data-sequence-system={systemIndex + 1}>
              <line className="staff-line" x1="68" x2="68" y1={systemY + 34} y2={systemY + 198} />
              <text className="clef sequence-clef treble-clef" x="76" y={systemY + 97} aria-hidden="true">
                𝄞
              </text>
              <text className="clef sequence-clef bass-clef" x="76" y={systemY + 190} aria-hidden="true">
                𝄢
              </text>
              {[...TREBLE_LINE_YS, ...BASS_LINE_YS].map((lineY) => (
                <line className="staff-line" key={lineY} x1="68" x2="786" y1={systemY + lineY} y2={systemY + lineY} />
              ))}
            </g>
          );
        })}

        {notes.map((note, index) => {
          const answer = answerNoteIds[index];
          const systemY = Math.floor(index / NOTES_PER_SYSTEM) * SYSTEM_HEIGHT;
          const x = SLOT_START_X + (index % NOTES_PER_SYSTEM) * SLOT_SPACING;
          const showResult = feedback !== null && (feedback.isCorrect || reveal);
          const isCorrect = answer === note.id;
          const answerClass = showResult ? (isCorrect ? "correct" : "wrong") : "entered";

          return (
            <g key={`${note.id}-${index}`} data-sequence-position={index + 1}>
              <text className="sequence-position-label" x={x} y={systemY + 224} aria-hidden="true">
                {index + 1}
              </text>
              {answer === undefined ? (
                <circle className="sequence-empty-position" cx={x} cy={systemY + 215} r="4" />
              ) : (
                <WrittenNote
                  className={`sequence-written-note ${answerClass}`}
                  noteId={answer}
                  systemY={systemY}
                  x={x}
                />
              )}
              {showResult && !isCorrect && (
                <WrittenNote className="sequence-written-note target" noteId={note.id} systemY={systemY} x={x + 13} />
              )}
              {feedback === null && index === answerNoteIds.length && (
                <path
                  className="sequence-entry-cursor"
                  d={`M ${x - 7} ${systemY + 211} L ${x + 7} ${systemY + 211} L ${x} ${systemY + 201} Z`}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="action-row sequence-edit-actions">
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
          Submit sequence
        </button>
      </div>
    </div>
  );
}

export default PitchSequenceAnswer;
