import type { TrainingNote } from "../types";

type MusicStaffProps = {
  note: TrainingNote;
};

function MusicStaff({ note }: MusicStaffProps) {
  const staffLines = [56, 72, 88, 104, 120];
  const shouldShowLedgerLine = note.id === "C4";

  return (
    <svg className="staff" viewBox="0 0 420 184" role="img" aria-label={`Treble staff note ${note.id}`}>
      <text className="clef" x="54" y="119" aria-hidden="true">
        𝄞
      </text>
      {staffLines.map((lineY) => (
        <line key={lineY} x1="34" x2="386" y1={lineY} y2={lineY} className="staff-line" />
      ))}
      {shouldShowLedgerLine && <line x1="212" x2="276" y1={note.staffY} y2={note.staffY} className="staff-line" />}
      <ellipse cx="244" cy={note.staffY} rx="18" ry="12" className="note-head" transform={`rotate(-18 244 ${note.staffY})`} />
      <line x1="259" x2="259" y1={note.staffY - 5} y2={note.staffY - 68} className="note-stem" />
    </svg>
  );
}

export default MusicStaff;
