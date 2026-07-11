import type { Song } from "../types";
import { getSheetNotePlacement } from "../noteData";
import { describeSongEvent } from "../songEngine";

type SheetStaffProps = {
  song: Song;
  currentIndex: number;
  currentStatus?: "idle" | "wrong";
};

const STAFF_LINES = [56, 72, 88, 104, 120];
const WINDOW_SIZE = 8;
const FIRST_EVENT_X = 128;
const EVENT_SPACING = 62;
const STEM_LENGTH = 42;
const HEAD_RX = 10;
const HEAD_RY = 7;
// Stems point up for notes on the lower half of the staff (middle line B4
// treble sits at Y 88) and down above it, following engraving convention.
const STEM_FLIP_Y = 88;

function getWindowStart(currentIndex: number, totalEvents: number): number {
  const lastStart = Math.max(0, totalEvents - WINDOW_SIZE);
  return Math.min(Math.max(0, currentIndex - 1), lastStart);
}

type EventState = "done" | "current" | "upcoming";

function getEventState(eventIndex: number, currentIndex: number): EventState {
  if (eventIndex < currentIndex) return "done";
  return eventIndex === currentIndex ? "current" : "upcoming";
}

function SheetStaff({ song, currentIndex, currentStatus = "idle" }: SheetStaffProps) {
  const clefSymbol = song.clef === "treble" ? "𝄞" : "𝄢";
  const clefY = song.clef === "treble" ? 119 : 112;
  const windowStart = getWindowStart(currentIndex, song.events.length);
  const windowEvents = song.events.slice(windowStart, windowStart + WINDOW_SIZE);
  const currentEvent = song.events[currentIndex];
  const progressLabel = `event ${Math.min(currentIndex + 1, song.events.length)} of ${song.events.length}`;
  const currentLabel = currentEvent ? `Current: ${describeSongEvent(currentEvent)}.` : "Song complete.";

  return (
    <svg
      className="sheet-staff"
      viewBox="0 0 640 184"
      role="img"
      aria-label={`Sheet music for ${song.title}, ${progressLabel}. ${currentLabel}`}
    >
      <text className={`clef ${song.clef}-clef sheet-clef`} x="34" y={clefY} aria-hidden="true">
        {clefSymbol}
      </text>
      {STAFF_LINES.map((lineY) => (
        <line key={lineY} x1="18" x2="622" y1={lineY} y2={lineY} className="staff-line" />
      ))}

      {windowEvents.map((event, slot) => {
        const eventIndex = windowStart + slot;
        const eventX = FIRST_EVENT_X + slot * EVENT_SPACING;
        const state = getEventState(eventIndex, currentIndex);
        const placements = event.noteIds
          .map((noteId) => ({ noteId, placement: getSheetNotePlacement(noteId, song.clef) }))
          .filter((entry): entry is { noteId: string; placement: NonNullable<typeof entry.placement> } =>
            Boolean(entry.placement),
          );

        if (placements.length === 0) return null;

        const staffYs = placements.map((entry) => entry.placement.staffY);
        const topY = Math.min(...staffYs);
        const bottomY = Math.max(...staffYs);
        const stemUp = bottomY >= STEM_FLIP_Y;
        const stemX = stemUp ? eventX + HEAD_RX - 1 : eventX - HEAD_RX + 1;
        const stemStartY = stemUp ? bottomY - 3 : topY + 3;
        const stemEndY = stemUp ? topY - STEM_LENGTH : bottomY + STEM_LENGTH;
        const hasStem = event.duration !== "whole";
        const hasFlag = event.duration === "eighth";
        const isHollow = event.duration === "whole" || event.duration === "half";
        const ledgerYs = [...new Set(placements.flatMap((entry) => entry.placement.ledgerLineYs))];
        const stateClass = state === "current" ? `current ${currentStatus === "wrong" ? "wrong" : ""}` : state;

        return (
          <g key={eventIndex} className={`sheet-event ${stateClass}`} data-event-index={eventIndex}>
            {state === "current" && (
              <rect className="sheet-current-highlight" x={eventX - 24} y="30" width="48" height="124" rx="10" />
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
                  <text className="sheet-accidental" x={eventX - 24} y={placement.staffY + 5} aria-hidden="true">
                    ♯
                  </text>
                )}
                <ellipse
                  className={`sheet-note-head ${isHollow ? "hollow" : ""}`}
                  cx={eventX}
                  cy={placement.staffY}
                  rx={HEAD_RX}
                  ry={HEAD_RY}
                  transform={`rotate(-18 ${eventX} ${placement.staffY})`}
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
