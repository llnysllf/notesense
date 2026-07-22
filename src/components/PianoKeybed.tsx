import type { CSSProperties } from "react";
import type { PianoKey } from "../noteData";
import { getBlackKeyLeft } from "./pianoKeyboardLayout";

type PianoKeybedProps = {
  whiteKeys: PianoKey[];
  blackKeys: PianoKey[];
  whiteKeyStart: number;
  whiteKeyCount: number;
  disabled: boolean;
  activeRangeEdge?: "start" | "end" | undefined;
  rangeEndNoteId?: string | undefined;
  rangeNoteIds?: Set<string> | undefined;
  rangeStartNoteId?: string | undefined;
  selectableKeyIds?: Set<string> | undefined;
  selectedNoteId: string | undefined;
  revealedNoteId: string | undefined;
  isCorrect: boolean | undefined;
  onKeySelect: (noteId: string) => void;
};

type KeyPositionStyle = CSSProperties & {
  "--black-key-left": string;
};

type KeybedStyle = CSSProperties & {
  "--piano-white-key-count": number;
};

function getVisibleKeyLabel(key: PianoKey): string {
  if (key.id === "A0" || key.id === "C8" || key.name === "C") {
    return key.id;
  }

  return key.name;
}

function getKeyStateClass(
  key: PianoKey,
  selectedNoteId?: string,
  revealedNoteId?: string,
  isCorrect?: boolean,
  rangeStartNoteId?: string,
  rangeEndNoteId?: string,
  rangeNoteIds?: Set<string>,
  activeRangeEdge?: "start" | "end",
): string {
  const stateClasses: string[] = [];

  if (key.id === selectedNoteId) {
    stateClasses.push(isCorrect === undefined ? "selected" : isCorrect ? "selected-correct" : "selected-wrong");
  }

  if (revealedNoteId !== undefined && key.id === revealedNoteId) {
    stateClasses.push("target-key");
  }

  if (rangeNoteIds?.has(key.id)) {
    stateClasses.push("range-key");
  }

  if (key.id === rangeStartNoteId) {
    stateClasses.push("range-boundary", activeRangeEdge === "start" ? "range-active-boundary" : "range-start");
  }

  if (key.id === rangeEndNoteId) {
    stateClasses.push("range-boundary", activeRangeEdge === "end" ? "range-active-boundary" : "range-end");
  }

  return stateClasses.join(" ");
}

function getKeyAriaLabel(
  key: PianoKey,
  selectedNoteId?: string,
  revealedNoteId?: string,
  isCorrect?: boolean,
  rangeStartNoteId?: string,
  rangeEndNoteId?: string,
  rangeNoteIds?: Set<string>,
): string {
  const parts = [`${key.isBlack ? "Black" : "White"} piano key ${key.id}`];

  if (key.id === selectedNoteId) {
    parts.push(isCorrect === undefined ? "selected" : isCorrect ? "selected correct" : "selected incorrect");
  }

  if (revealedNoteId !== undefined && key.id === revealedNoteId) {
    parts.push("target note");
  }

  if (rangeNoteIds?.has(key.id)) {
    parts.push("inside selected range");
  }

  if (key.id === rangeStartNoteId) {
    parts.push("range start");
  }

  if (key.id === rangeEndNoteId) {
    parts.push("range end");
  }

  return parts.join(", ");
}

function PianoKeybed({
  whiteKeys,
  blackKeys,
  whiteKeyStart,
  whiteKeyCount,
  disabled,
  activeRangeEdge,
  rangeEndNoteId,
  rangeNoteIds,
  rangeStartNoteId,
  selectableKeyIds,
  selectedNoteId,
  revealedNoteId,
  isCorrect,
  onKeySelect,
}: PianoKeybedProps) {
  return (
    <div className="piano-keybed" style={{ "--piano-white-key-count": whiteKeyCount } as KeybedStyle}>
      <div className="piano-white-keys">
        {whiteKeys.map((key) => {
          const keyDisabled = disabled || (selectableKeyIds !== undefined && !selectableKeyIds.has(key.id));

          return (
            <button
              className={`piano-key white-key ${getKeyStateClass(
                key,
                selectedNoteId,
                revealedNoteId,
                isCorrect,
                rangeStartNoteId,
                rangeEndNoteId,
                rangeNoteIds,
                activeRangeEdge,
              )}`}
              key={key.id}
              type="button"
              aria-label={getKeyAriaLabel(
                key,
                selectedNoteId,
                revealedNoteId,
                isCorrect,
                rangeStartNoteId,
                rangeEndNoteId,
                rangeNoteIds,
              )}
              aria-disabled={keyDisabled}
              onClick={() => {
                if (!keyDisabled) onKeySelect(key.id);
              }}
            >
              <span>{getVisibleKeyLabel(key)}</span>
            </button>
          );
        })}
      </div>

      <div className="piano-black-keys">
        {blackKeys.map((key) => {
          const keyDisabled = disabled || (selectableKeyIds !== undefined && !selectableKeyIds.has(key.id));

          return (
            <button
              className={`piano-key black-key ${getKeyStateClass(
                key,
                selectedNoteId,
                revealedNoteId,
                isCorrect,
                rangeStartNoteId,
                rangeEndNoteId,
                rangeNoteIds,
                activeRangeEdge,
              )}`}
              key={key.id}
              type="button"
              style={{ "--black-key-left": getBlackKeyLeft(key, whiteKeyStart, whiteKeyCount) } as KeyPositionStyle}
              aria-label={getKeyAriaLabel(
                key,
                selectedNoteId,
                revealedNoteId,
                isCorrect,
                rangeStartNoteId,
                rangeEndNoteId,
                rangeNoteIds,
              )}
              aria-disabled={keyDisabled}
              onClick={() => {
                if (!keyDisabled) onKeySelect(key.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PianoKeybed;
