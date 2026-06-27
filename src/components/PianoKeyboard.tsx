import type { CSSProperties } from "react";
import { PIANO_KEYS, PIANO_WHITE_KEY_COUNT } from "../noteData";
import type { PianoKey } from "../noteData";

type PianoKeyboardProps = {
  disabled: boolean;
  revealedNoteId?: string | undefined;
  selectedNoteId?: string | undefined;
  isCorrect?: boolean | undefined;
  onKeySelect: (noteId: string) => void;
};

type KeyPositionStyle = CSSProperties & {
  "--black-key-left": string;
};

type KeybedStyle = CSSProperties & {
  "--piano-white-key-count": number;
};

const WHITE_KEYS = PIANO_KEYS.filter((key) => !key.isBlack);
const BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack);

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

function getBlackKeyLeft(key: PianoKey): string {
  const afterWhiteIndex = key.blackKeyAfterWhiteIndex ?? 0;
  const leftPercent = ((afterWhiteIndex + 0.68) / PIANO_WHITE_KEY_COUNT) * 100;

  return `${leftPercent}%`;
}

function PianoKeyboard({ disabled, revealedNoteId, selectedNoteId, isCorrect, onKeySelect }: PianoKeyboardProps) {
  function handleKeySelect(noteId: string) {
    if (disabled) return;
    onKeySelect(noteId);
  }

  return (
    <div className="piano-keyboard-panel">
      <div className="piano-keyboard-viewport" role="group" aria-label="88-key piano keyboard">
        <div className="piano-keybed" style={{ "--piano-white-key-count": PIANO_WHITE_KEY_COUNT } as KeybedStyle}>
          <div className="piano-white-keys">
            {WHITE_KEYS.map((key) => (
              <button
                className={`piano-key white-key ${getKeyStateClass(key, selectedNoteId, revealedNoteId, isCorrect)}`}
                key={key.id}
                type="button"
                aria-label={getKeyAriaLabel(key, selectedNoteId, revealedNoteId, isCorrect)}
                aria-disabled={disabled}
                onClick={() => handleKeySelect(key.id)}
              >
                <span>{getVisibleKeyLabel(key)}</span>
              </button>
            ))}
          </div>

          <div className="piano-black-keys">
            {BLACK_KEYS.map((key) => (
              <button
                className={`piano-key black-key ${getKeyStateClass(key, selectedNoteId, revealedNoteId, isCorrect)}`}
                key={key.id}
                type="button"
                style={{ "--black-key-left": getBlackKeyLeft(key) } as KeyPositionStyle}
                aria-label={getKeyAriaLabel(key, selectedNoteId, revealedNoteId, isCorrect)}
                aria-disabled={disabled}
                onClick={() => handleKeySelect(key.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PianoKeyboard;
