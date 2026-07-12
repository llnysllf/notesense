import type { Song } from "../types";
import { getSheetNotePlacement } from "../noteData";
import { describeSongEvent, getEventMeasureStarts, getTimeSignatureLabel } from "../songEngine";

type SheetStaffProps = {
  song: Song;
  currentIndex: number;
  currentStatus?: "idle" | "wrong";
};

// The whole song renders as a static score split across staff systems, like
// printed sheet music: notes never move while playing. The current event is
// shown by coloring the note itself and a caret under the staff, so the
// staff lines stay fully visible. Barlines divide the events into measures
// according to the song's time signature, shown once per system.
const STAFF_LINE_OFFSETS = [56, 72, 88, 104, 120];
const EVENTS_PER_SYSTEM = 12;
const SYSTEM_HEIGHT = 210;
const SHEET_WIDTH = 800;
const FIRST_EVENT_X = 112;
const EVENT_SPACING = 56;
const STAFF_X_START = 18;
const STAFF_X_END = 782;
const STEM_LENGTH = 42;
const HEAD_RX = 10;
const HEAD_RY = 7;
// Stems point up for notes on the lower half of the staff (middle line B4
// treble sits at offset 88) and down above it, per engraving convention.
const STEM_FLIP_OFFSET = 88;
const TIME_SIGNATURE_X = 76;
const BARLINE_ROW_START_X = 96;
const BARLINE_TOP_OFFSET = 56;
const BARLINE_BOTTOM_OFFSET = 120;

type EventState = "done" | "current" | "upcoming";

function getEventState(eventIndex: number, currentIndex: number): EventState {
  if (eventIndex < currentIndex) return "done";
  return eventIndex === currentIndex ? "current" : "upcoming";
}

function SheetStaff({ song, currentIndex, currentStatus = "idle" }: SheetStaffProps) {
  const clefSymbol = song.clef === "treble" ? "𝄞" : "𝄢";
  const clefOffset = song.clef === "treble" ? 119 : 112;
  const systemCount = Math.max(1, Math.ceil(song.events.length / EVENTS_PER_SYSTEM));
  const sheetHeight = systemCount * SYSTEM_HEIGHT;
  const currentEvent = song.events[currentIndex];
  const progressLabel = `event ${Math.min(currentIndex + 1, song.events.length)} of ${song.events.length}`;
  const [timeSignatureNumerator, timeSignatureDenominator] = getTimeSignatureLabel(song.timeSignature).split("/");
  const timeSignatureLabel = `${getTimeSignatureLabel(song.timeSignature)} time`;
  const currentLabel = currentEvent ? `Current: ${describeSongEvent(currentEvent)}.` : "Song complete.";
  const measureStarts = getEventMeasureStarts(song);

  return (
    <svg
      className="sheet-staff"
      viewBox={`0 0 ${SHEET_WIDTH} ${sheetHeight}`}
      role="img"
      aria-label={`Sheet music for ${song.title} in ${timeSignatureLabel}, ${progressLabel}. ${currentLabel}`}
    >
      {Array.from({ length: systemCount }, (_, systemIndex) => {
        const systemY = systemIndex * SYSTEM_HEIGHT;

        return (
          <g key={systemIndex}>
            <text className={`clef ${song.clef}-clef sheet-clef`} x="34" y={systemY + clefOffset} aria-hidden="true">
              {clefSymbol}
            </text>
            {STAFF_LINE_OFFSETS.map((lineOffset) => (
              <line
                key={lineOffset}
                x1={STAFF_X_START}
                x2={STAFF_X_END}
                y1={systemY + lineOffset}
                y2={systemY + lineOffset}
                className="staff-line"
              />
            ))}
            <text className="sheet-time-signature" x={TIME_SIGNATURE_X} y={systemY + 80} aria-hidden="true">
              {timeSignatureNumerator}
            </text>
            <text className="sheet-time-signature" x={TIME_SIGNATURE_X} y={systemY + 112} aria-hidden="true">
              {timeSignatureDenominator}
            </text>
          </g>
        );
      })}

      {song.events.map((event, eventIndex) => {
        const systemIndex = Math.floor(eventIndex / EVENTS_PER_SYSTEM);
        const slot = eventIndex % EVENTS_PER_SYSTEM;
        const systemY = systemIndex * SYSTEM_HEIGHT;
        const eventX = FIRST_EVENT_X + slot * EVENT_SPACING;
        const state = getEventState(eventIndex, currentIndex);
        const showBarline = eventIndex > 0 && measureStarts[eventIndex] === true;
        const barlineX = slot === 0 ? BARLINE_ROW_START_X : eventX - EVENT_SPACING / 2;
        const placements = event.noteIds
          .map((noteId) => ({ noteId, placement: getSheetNotePlacement(noteId, song.clef) }))
          .filter((entry): entry is { noteId: string; placement: NonNullable<typeof entry.placement> } =>
            Boolean(entry.placement),
          );

        if (placements.length === 0) return null;

        const noteYs = placements.map((entry) => systemY + entry.placement.staffY);
        const topY = Math.min(...noteYs);
        const bottomY = Math.max(...noteYs);
        const stemUp = bottomY - systemY >= STEM_FLIP_OFFSET;
        const stemX = stemUp ? eventX + HEAD_RX - 1 : eventX - HEAD_RX + 1;
        const stemStartY = stemUp ? bottomY - 3 : topY + 3;
        const stemEndY = stemUp ? topY - STEM_LENGTH : bottomY + STEM_LENGTH;
        const hasStem = event.duration !== "whole";
        const hasFlag = event.duration === "eighth";
        const isHollow = event.duration === "whole" || event.duration === "half";
        const ledgerYs = [...new Set(placements.flatMap((entry) => entry.placement.ledgerLineYs))].map(
          (ledgerOffset) => systemY + ledgerOffset,
        );
        const stateClass = state === "current" ? `current ${currentStatus === "wrong" ? "wrong" : ""}` : state;
        const caretY = systemY + STAFF_LINE_OFFSETS[STAFF_LINE_OFFSETS.length - 1]! + 26;

        return (
          <g key={eventIndex} className={`sheet-event ${stateClass}`} data-event-index={eventIndex}>
            {showBarline && (
              <line
                className="sheet-barline"
                data-barline="true"
                x1={barlineX}
                x2={barlineX}
                y1={systemY + BARLINE_TOP_OFFSET}
                y2={systemY + BARLINE_BOTTOM_OFFSET}
              />
            )}
            {state === "current" && (
              <path
                className="sheet-cursor"
                d={`M ${eventX - 7} ${caretY + 10} L ${eventX + 7} ${caretY + 10} L ${eventX} ${caretY} Z`}
              />
            )}
            {ledgerYs.map((ledgerY) => (
              <line key={ledgerY} x1={eventX - 16} x2={eventX + 16} y1={ledgerY} y2={ledgerY} className="staff-line" />
            ))}
            {hasStem && <line className="sheet-stem" x1={stemX} x2={stemX} y1={stemStartY} y2={stemEndY} />}
            {hasFlag && (
              <path
                className="sheet-flag"
                d={stemUp ? `M ${stemX} ${stemEndY} q 14 6 10 24` : `M ${stemX} ${stemEndY} q 14 -6 10 -24`}
              />
            )}
            {placements.map(({ noteId, placement }) => (
              <g key={noteId}>
                {placement.isSharp && (
                  <text
                    className="sheet-accidental"
                    x={eventX - 24}
                    y={systemY + placement.staffY + 5}
                    aria-hidden="true"
                  >
                    ♯
                  </text>
                )}
                <ellipse
                  className={`sheet-note-head ${isHollow ? "hollow" : ""}`}
                  cx={eventX}
                  cy={systemY + placement.staffY}
                  rx={HEAD_RX}
                  ry={HEAD_RY}
                  transform={`rotate(-18 ${eventX} ${systemY + placement.staffY})`}
                />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default SheetStaff;
