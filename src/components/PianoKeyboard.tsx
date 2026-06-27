import { useEffect, useState, type CSSProperties } from "react";
import { PIANO_KEYS, PIANO_WHITE_KEY_COUNT } from "../noteData";
import type { PianoKey } from "../noteData";
import {
  FULL_BLACK_KEYS,
  FULL_WHITE_KEYS,
  MOBILE_QUERY,
  MOBILE_WHITE_KEY_COUNT,
  getBlackKeyLeft,
  getWindowKeys,
} from "./pianoKeyboardLayout";

type PianoKeyboardProps = {
  disabled: boolean;
  revealedNoteId?: string | undefined;
  selectedNoteId?: string | undefined;
  targetNoteId: string;
  isCorrect?: boolean | undefined;
  onKeySelect: (noteId: string) => void;
};

type KeyPositionStyle = CSSProperties & {
  "--black-key-left": string;
};

type KeybedStyle = CSSProperties & {
  "--piano-white-key-count": number;
};

function getIsMobilePianoLayout(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}

function useIsMobilePianoLayout(): boolean {
  const [isMobile, setIsMobile] = useState(getIsMobilePianoLayout);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isMobile;
}

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

function getOverviewKeyStateClass(
  key: PianoKey,
  selectedNoteId?: string,
  revealedNoteId?: string,
  isCorrect?: boolean,
) {
  const stateClasses: string[] = [];

  if (key.id === selectedNoteId) {
    stateClasses.push(isCorrect ? "overview-selected-correct" : "overview-selected-wrong");
  }

  if (revealedNoteId !== undefined && key.id === revealedNoteId) {
    stateClasses.push("overview-target");
  }

  return stateClasses.join(" ");
}

function renderKeybed(
  whiteKeys: PianoKey[],
  blackKeys: PianoKey[],
  whiteKeyStart: number,
  whiteKeyCount: number,
  disabled: boolean,
  selectedNoteId: string | undefined,
  revealedNoteId: string | undefined,
  isCorrect: boolean | undefined,
  onKeySelect: (noteId: string) => void,
) {
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

function PianoKeyboard({
  disabled,
  revealedNoteId,
  selectedNoteId,
  targetNoteId,
  isCorrect,
  onKeySelect,
}: PianoKeyboardProps) {
  const isMobileLayout = useIsMobilePianoLayout();
  const targetDisplayId = revealedNoteId ?? targetNoteId;
  const mobileWindow = getWindowKeys(targetDisplayId);
  function handleKeySelect(noteId: string) {
    if (disabled) return;
    onKeySelect(noteId);
  }

  return (
    <div className="piano-keyboard-panel" data-layout={isMobileLayout ? "mobile-window" : "full"}>
      <div className="piano-keyboard-viewport" role="group" aria-label="88-key piano keyboard">
        {isMobileLayout ? (
          <div className="piano-mobile-layout">
            {renderKeybed(
              mobileWindow.whiteKeys,
              mobileWindow.blackKeys,
              mobileWindow.whiteKeyStart,
              MOBILE_WHITE_KEY_COUNT,
              disabled,
              selectedNoteId,
              revealedNoteId,
              isCorrect,
              handleKeySelect,
            )}
            <div className="piano-overview-rail" role="img" aria-label="Full 88-key piano overview">
              {PIANO_KEYS.map((key) => (
                <span
                  aria-hidden="true"
                  className={`piano-overview-key ${key.isBlack ? "overview-black-key" : "overview-white-key"} ${getOverviewKeyStateClass(
                    key,
                    selectedNoteId,
                    targetDisplayId,
                    isCorrect,
                  )}`}
                  data-piano-overview-key={key.id}
                  key={key.id}
                />
              ))}
            </div>
          </div>
        ) : (
          renderKeybed(
            FULL_WHITE_KEYS,
            FULL_BLACK_KEYS,
            0,
            PIANO_WHITE_KEY_COUNT,
            disabled,
            selectedNoteId,
            revealedNoteId,
            isCorrect,
            handleKeySelect,
          )
        )}
      </div>
    </div>
  );
}

export default PianoKeyboard;
