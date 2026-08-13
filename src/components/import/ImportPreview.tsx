import { getSheetNotePlacement } from "../../noteData";
import type { MidiImportPreview } from "../../types";

// What the import will actually produce.
//
// Shown before saving, because the mapping is lossy and a learner should see
// the result rather than a promise about it. The warnings are not fine print:
// they are the reason this screen exists.

type ImportPreviewProps = {
  preview: MidiImportPreview;
  summary: string | undefined;
  savedMessage: string | null;
  onSave: () => void;
};

const STAFF_LINES = [56, 72, 88, 104, 120];
const VIEW_WIDTH = 720;
const FIRST_X = 96;
const SPACING = 26;
// Enough to see the shape of the opening without drawing a whole piece.
const PREVIEW_EVENTS = 22;

function ImportPreview({ preview, summary, savedMessage, onSave }: ImportPreviewProps) {
  const events = preview.song.events.slice(0, PREVIEW_EVENTS);
  const isEmpty = preview.song.events.length === 0;

  return (
    <div className="import-card">
      <h4>Preview</h4>

      <p className="import-file">
        {preview.song.title} — {preview.song.events.length} events, {preview.song.timeSignature.beatsPerMeasure}/
        {preview.song.timeSignature.beatUnit === "eighth" ? 8 : 4}
      </p>

      {isEmpty ? null : (
        <svg
          className="staff import-staff"
          viewBox={`0 0 ${VIEW_WIDTH} 184`}
          role="img"
          aria-label={`Opening of ${preview.song.title}: ${events
            .map((event) => event.noteIds.join(" and "))
            .join(", ")}`}
        >
          <text className="clef treble-clef" x="44" y="119" aria-hidden="true">
            𝄞
          </text>
          {STAFF_LINES.map((lineY) => (
            <line key={lineY} x1="20" x2={VIEW_WIDTH - 16} y1={lineY} y2={lineY} className="staff-line" />
          ))}

          {events.flatMap((event, index) =>
            event.noteIds.map((noteId) => {
              const placement = getSheetNotePlacement(noteId, preview.song.clef);
              if (!placement) return null;
              const x = FIRST_X + index * SPACING;

              return (
                <g key={`${index}-${noteId}`} className="import-note">
                  {placement.ledgerLineYs.map((ledgerY) => (
                    <line key={ledgerY} x1={x - 9} x2={x + 9} y1={ledgerY} y2={ledgerY} className="staff-line" />
                  ))}
                  <ellipse cx={x} cy={placement.staffY} rx={7} ry={5} className="note-head" />
                </g>
              );
            }),
          )}
        </svg>
      )}

      {summary ? (
        <p className="import-warning" role="note">
          {summary}
        </p>
      ) : (
        <p className="import-note">This file mapped across cleanly.</p>
      )}

      {savedMessage ? (
        <p className="import-saved-message" role="status">
          {savedMessage}
        </p>
      ) : null}

      <div className="import-actions">
        <button type="button" className="primary-button" onClick={onSave} disabled={isEmpty}>
          Save to my songs
        </button>
      </div>
    </div>
  );
}

export default ImportPreview;
