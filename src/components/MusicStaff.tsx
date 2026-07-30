import type { TrainingNote } from "../types";

type MusicStaffProps = {
  hideNote?: boolean;
  note: TrainingNote;
  nextNote?: TrainingNote | null;
};

function NoteGlyph({ note, x, variant = "current" }: { note: TrainingNote; x: number; variant?: "current" | "next" }) {
  const ledgerLineYs = note.ledgerLineYs ?? [];

  return (
    <g className={`staff-note ${variant}`}>
      {ledgerLineYs.map((ledgerLineY) => (
        <line
          key={`${variant}-${ledgerLineY}`}
          x1={x - 32}
          x2={x + 32}
          y1={ledgerLineY}
          y2={ledgerLineY}
          className="staff-line"
        />
      ))}
      <ellipse
        cx={x}
        cy={note.staffY}
        rx={variant === "next" ? 14 : 18}
        ry={variant === "next" ? 9 : 12}
        className="note-head"
        transform={`rotate(-18 ${x} ${note.staffY})`}
      />
      <line x1={x + 15} x2={x + 15} y1={note.staffY - 5} y2={note.staffY - 68} className="note-stem" />
    </g>
  );
}

function MusicStaff({ hideNote = false, note, nextNote = null }: MusicStaffProps) {
  const staffLines = [56, 72, 88, 104, 120];
  const isTreble = note.clef === "treble";
  const clefLabel = isTreble ? "Treble" : "Bass";
  const clefSymbol = isTreble ? "𝄞" : "𝄢";
  const clefY = isTreble ? 119 : 112;

  return (
    <svg className="staff" viewBox="0 0 420 184" role="img" aria-label={`${clefLabel} staff note ${note.id}`}>
      <text className={`clef ${note.clef}-clef`} x="54" y={clefY} aria-hidden="true">
        {clefSymbol}
      </text>
      {staffLines.map((lineY) => (
        <line key={lineY} x1="34" x2="386" y1={lineY} y2={lineY} className="staff-line" />
      ))}
      {hideNote ? (
        <text className="audiation-cue" x="244" y="96" textAnchor="middle" aria-hidden="true">
          .
        </text>
      ) : (
        <NoteGlyph note={note} x={232} />
      )}
      {nextNote ? <NoteGlyph note={nextNote} x={318} variant="next" /> : null}
    </svg>
  );
}

export default MusicStaff;
