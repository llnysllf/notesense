import { getSheetNotePlacement } from "../../noteData";
import { midiToNoteId, type SingingExercise, type SungScore } from "../../types";

// What to sing, and — once graded — how each note went.
//
// The roadmap asks for expected against performed **pitch contour**, not a
// waveform. A waveform shows loudness over time, which tells a singer nothing
// they can act on; what they need is where each note sat against where it was
// written. So each note is drawn at its written height, and after the take a
// marker shows where they actually sang it.

type SingingTargetsProps = {
  exercise: SingingExercise;
  score: SungScore | null;
  referenceLabel: string;
};

const STAFF_LINES = [56, 72, 88, 104, 120];
const VIEW_WIDTH = 720;
const FIRST_X = 110;
const LAST_X = VIEW_WIDTH - 50;

function SingingTargets({ exercise, score, referenceLabel }: SingingTargetsProps) {
  const { targets } = exercise;
  const noteX = (index: number) =>
    targets.length <= 1 ? FIRST_X : FIRST_X + (index / (targets.length - 1)) * (LAST_X - FIRST_X);

  const written = targets.map((target) => midiToNoteId(target.midi)).join(", ");

  return (
    <div className="singing-targets">
      <p className="singing-reference">Starts on {referenceLabel}</p>

      <svg
        className="staff singing-staff"
        viewBox={`0 0 ${VIEW_WIDTH} 184`}
        role="img"
        aria-label={
          score
            ? `Phrase to sing: ${written}. ${score.perNote
                .map((note, index) =>
                  note.sung
                    ? `Note ${index + 1} sung ${Math.abs(Math.round(note.centsError ?? 0))} cents ${
                        (note.centsError ?? 0) < 0 ? "flat" : "sharp"
                      }`
                    : `Note ${index + 1} not sung`,
                )
                .join(", ")}.`
            : `Phrase to sing: ${written}.`
        }
      >
        <text className="clef treble-clef" x="44" y="119" aria-hidden="true">
          𝄞
        </text>
        {STAFF_LINES.map((lineY) => (
          <line key={lineY} x1="20" x2={VIEW_WIDTH - 16} y1={lineY} y2={lineY} className="staff-line" />
        ))}

        {targets.map((target, index) => {
          const placement = getSheetNotePlacement(midiToNoteId(target.midi), "treble");
          if (!placement) return null;
          const x = noteX(index);
          const result = score?.perNote[index];
          // A semitone is eight pixels on this staff, so cents map to a small
          // vertical offset the eye can read as sharp or flat.
          const sungY = result?.sung ? placement.staffY - ((result.centsError ?? 0) / 100) * 8 : undefined;

          return (
            <g key={`${index}-${target.midi}`} className="singing-note">
              {placement.ledgerLineYs.map((ledgerY) => (
                <line key={ledgerY} x1={x - 12} x2={x + 12} y1={ledgerY} y2={ledgerY} className="staff-line" />
              ))}
              <ellipse cx={x} cy={placement.staffY} rx={8} ry={6} className="note-head" />
              {sungY !== undefined ? (
                <line
                  className={`singing-sung ${result?.centsError !== undefined && Math.abs(result.centsError) <= 35 ? "in-tune" : "out"}`}
                  x1={x - 14}
                  x2={x + 14}
                  y1={sungY}
                  y2={sungY}
                />
              ) : null}
              {result && !result.sung ? (
                <text className="singing-missing" x={x - 5} y={placement.staffY + 30} aria-hidden="true">
                  ·
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default SingingTargets;
