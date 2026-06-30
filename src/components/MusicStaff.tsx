import type { TrainingNote } from "../types";

type MusicStaffProps = {
  note: TrainingNote;
};

function MusicStaff({ note }: MusicStaffProps) {
  const staffLines = [56, 72, 88, 104, 120];
  const clefLabel = note.clef === "treble" ? "Treble" : "Bass";
  const clefSymbol = note.clef === "treble" ? "𝄞" : "𝄢";
  const clefY = note.clef === "treble" ? 119 : 112;
  const ledgerLineYs = note.ledgerLineYs ?? (note.ledgerLineY === undefined ? [] : [note.ledgerLineY]);

  return (
    <svg className="staff" viewBox="0 0 420 184" role="img" aria-label={`${clefLabel} staff note ${note.id}`}>
      <text className={`clef ${note.clef}-clef`} x="54" y={clefY} aria-hidden="true">
        {clefSymbol}
      </text>
      {staffLines.map((lineY) => (
        <line key={lineY} x1="34" x2="386" y1={lineY} y2={lineY} className="staff-line" />
      ))}
      {ledgerLineYs.map((ledgerLineY) => (
        <line key={ledgerLineY} x1="212" x2="276" y1={ledgerLineY} y2={ledgerLineY} className="staff-line" />
      ))}
      <ellipse
        cx="244"
        cy={note.staffY}
        rx="18"
        ry="12"
        className="note-head"
        transform={`rotate(-18 244 ${note.staffY})`}
      />
      <line x1="259" x2="259" y1={note.staffY - 5} y2={note.staffY - 68} className="note-stem" />
    </svg>
  );
}

export default MusicStaff;
