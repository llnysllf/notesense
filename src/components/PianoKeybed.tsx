import type { CSSProperties } from "react";
import type { PianoKey } from "../noteData";
import { getBlackKeyLeft } from "./pianoKeyboardLayout";

type PianoKeybedProps = {
  whiteKeys: PianoKey[];
  blackKeys: PianoKey[];
  whiteKeyStart: number;
  whiteKeyCount: number;
  disabled: boolean;
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
): string {
  const stateClasses: string[] = [];

  if (key.id === selectedNoteId) {
    stateClasses.push(isCorrect ? "selected-correct" : "selected-wrong");
  }

  if (revealedNoteId !== undefined && key.id === revealedNoteId) {
    stateClasses.push("target-key");
  }

  return stateClasses.join(" ");
}

function getKeyAriaLabel(key: PianoKey, selectedNoteId?: string, revealedNoteId?: string, isCorrect?: boolean): string {
  const parts = [`${key.isBlack ? "Black" : "White"} piano key ${key.id}`];

  if (key.id === selectedNoteId) {
    parts.push(isCorrect ? "selected correct" : "selected incorrect");
  }

  if (revealedNoteId !== undefined && key.id === revealedNoteId) {
    parts.push("target note");
  }

  return parts.join(", ");
}

function PianoKeybed({
  whiteKeys,
  blackKeys,
  whiteKeyStart,
  whiteKeyCount,
  disabled,
  selectedNoteId,
  revealedNoteId,
  isCorrect,
  onKeySelect,
}: PianoKeybedProps) {
  return (
    <div className="piano-keybed" style={{ "--piano-white-key-count": whiteKeyCount } as KeybedStyle}>
      <div className="piano-white-keys">
        {whiteKeys.map((key) => (
          <button
            className={`piano-key white-key ${getKeyStateClass(key, selectedNoteId, revealedNoteId, isCorrect)}`}
            key={key.id}
            type="button"
            aria-label={getKeyAriaLabel(key, selectedNoteId, revealedNoteId, isCorrect)}
            aria-disabled={disabled}
            onClick={() => {
              if (!disabled) onKeySelect(key.id);
            }}
          >
            <span>{getVisibleKeyLabel(key)}</span>
          </button>
        ))}
      </div>

      <div className="piano-black-keys">
        {blackKeys.map((key) => (
          <button
            className={`piano-key black-key ${getKeyStateClass(key, selectedNoteId, revealedNoteId, isCorrect)}`}
            key={key.id}
            type="button"
            style={{ "--black-key-left": getBlackKeyLeft(key, whiteKeyStart, whiteKeyCount) } as KeyPositionStyle}
            aria-label={getKeyAriaLabel(key, selectedNoteId, revealedNoteId, isCorrect)}
            aria-disabled={disabled}
            onClick={() => {
              if (!disabled) onKeySelect(key.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default PianoKeybed;
