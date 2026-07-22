import { useEffect, useState, type MouseEvent } from "react";
import { PIANO_KEYS, PIANO_WHITE_KEY_COUNT } from "../noteData";
import type { PianoKey } from "../noteData";
import PianoKeybed from "./PianoKeybed";
import {
  FULL_BLACK_KEYS,
  FULL_WHITE_KEYS,
  MOBILE_DEFAULT_CENTER_NOTE_ID,
  MOBILE_QUERY,
  MOBILE_WINDOW_STEP_WHITE_KEYS,
  MOBILE_WHITE_KEY_COUNT,
  getMovedWindowCenterNoteId,
  getOverviewCenterNoteId,
  getWindowKeys,
} from "./pianoKeyboardLayout";

type PianoKeyboardProps = {
  disabled: boolean;
  activeRangeEdge?: "start" | "end" | undefined;
  rangeEndNoteId?: string | undefined;
  rangeNoteIds?: Set<string> | undefined;
  rangeStartNoteId?: string | undefined;
  selectableKeyIds?: Set<string> | undefined;
  revealedNoteId?: string | undefined;
  selectedNoteId?: string | undefined;
  isCorrect?: boolean | undefined;
  onKeySelect: (noteId: string) => void;
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

function getOverviewKeyStateClass(
  key: PianoKey,
  visibleKeyIds: Set<string>,
  selectedNoteId?: string,
  revealedNoteId?: string,
  isCorrect?: boolean,
  rangeStartNoteId?: string,
  rangeEndNoteId?: string,
  rangeNoteIds?: Set<string>,
  activeRangeEdge?: "start" | "end",
) {
  const stateClasses: string[] = [];

  if (visibleKeyIds.has(key.id)) {
    stateClasses.push("overview-window");
  }

  if (key.id === selectedNoteId) {
    stateClasses.push(
      isCorrect === undefined
        ? "overview-selected"
        : isCorrect
          ? "overview-selected-correct"
          : "overview-selected-wrong",
    );
  }

  if (revealedNoteId !== undefined && key.id === revealedNoteId) {
    stateClasses.push("overview-target");
  }

  if (rangeNoteIds?.has(key.id)) {
    stateClasses.push("overview-range-key");
  }

  if (key.id === rangeStartNoteId) {
    stateClasses.push(
      "overview-range-boundary",
      activeRangeEdge === "start" ? "overview-range-active-boundary" : "overview-range-start",
    );
  }

  if (key.id === rangeEndNoteId) {
    stateClasses.push(
      "overview-range-boundary",
      activeRangeEdge === "end" ? "overview-range-active-boundary" : "overview-range-end",
    );
  }

  return stateClasses.join(" ");
}

function PianoKeyboard({
  disabled,
  activeRangeEdge,
  rangeEndNoteId,
  rangeNoteIds,
  rangeStartNoteId,
  selectableKeyIds,
  revealedNoteId,
  selectedNoteId,
  isCorrect,
  onKeySelect,
}: PianoKeyboardProps) {
  const isMobileLayout = useIsMobilePianoLayout();
  const [mobileCenterNoteId, setMobileCenterNoteId] = useState(MOBILE_DEFAULT_CENTER_NOTE_ID);
  const mobileWindow = getWindowKeys(revealedNoteId ?? mobileCenterNoteId);
  const visibleMobileKeyIds = new Set([...mobileWindow.whiteKeys, ...mobileWindow.blackKeys].map((key) => key.id));

  function handleKeySelect(noteId: string) {
    if (disabled) return;
    onKeySelect(noteId);
  }

  function moveMobileWindow(whiteKeyOffset: number) {
    setMobileCenterNoteId((centerNoteId) => getMovedWindowCenterNoteId(centerNoteId, whiteKeyOffset));
  }

  function handleOverviewClick(event: MouseEvent<HTMLButtonElement>) {
    // Keyboard and assistive-tech activation dispatch clicks without pointer
    // coordinates (detail 0); recenter on C4 instead of jumping to the far left.
    if (event.detail === 0) {
      setMobileCenterNoteId(MOBILE_DEFAULT_CENTER_NOTE_ID);
      return;
    }

    const railRect = event.currentTarget.getBoundingClientRect();

    setMobileCenterNoteId(getOverviewCenterNoteId(event.clientX, railRect.left, railRect.width));
  }

  return (
    <div className="piano-keyboard-panel" data-layout={isMobileLayout ? "mobile-window" : "full"}>
      <div className="piano-keyboard-viewport" role="group" aria-label="88-key piano keyboard">
        {isMobileLayout ? (
          <div className="piano-mobile-layout" data-window-center-note-id={mobileCenterNoteId}>
            <div className="piano-mobile-controls" aria-label="Piano window controls">
              <button
                className="piano-window-button"
                type="button"
                aria-label="Move piano window left"
                onClick={() => moveMobileWindow(-MOBILE_WINDOW_STEP_WHITE_KEYS)}
              >
                &lt;
              </button>
              <button
                className="piano-window-button"
                type="button"
                aria-label="Center piano window on C4"
                onClick={() => setMobileCenterNoteId(MOBILE_DEFAULT_CENTER_NOTE_ID)}
              >
                C4
              </button>
              <button
                className="piano-window-button"
                type="button"
                aria-label="Move piano window right"
                onClick={() => moveMobileWindow(MOBILE_WINDOW_STEP_WHITE_KEYS)}
              >
                &gt;
              </button>
            </div>
            <PianoKeybed
              whiteKeys={mobileWindow.whiteKeys}
              blackKeys={mobileWindow.blackKeys}
              whiteKeyStart={mobileWindow.whiteKeyStart}
              whiteKeyCount={MOBILE_WHITE_KEY_COUNT}
              disabled={disabled}
              activeRangeEdge={activeRangeEdge}
              rangeEndNoteId={rangeEndNoteId}
              rangeNoteIds={rangeNoteIds}
              rangeStartNoteId={rangeStartNoteId}
              selectableKeyIds={selectableKeyIds}
              selectedNoteId={selectedNoteId}
              revealedNoteId={revealedNoteId}
              isCorrect={isCorrect}
              onKeySelect={handleKeySelect}
            />
            <button
              className="piano-overview-rail"
              type="button"
              aria-label="Move piano window on full 88-key overview"
              onClick={handleOverviewClick}
            >
              {PIANO_KEYS.map((key) => (
                <span
                  aria-hidden="true"
                  className={`piano-overview-key ${key.isBlack ? "overview-black-key" : "overview-white-key"} ${getOverviewKeyStateClass(
                    key,
                    visibleMobileKeyIds,
                    selectedNoteId,
                    revealedNoteId,
                    isCorrect,
                    rangeStartNoteId,
                    rangeEndNoteId,
                    rangeNoteIds,
                    activeRangeEdge,
                  )}`}
                  data-piano-overview-key={key.id}
                  key={key.id}
                />
              ))}
            </button>
          </div>
        ) : (
          <PianoKeybed
            whiteKeys={FULL_WHITE_KEYS}
            blackKeys={FULL_BLACK_KEYS}
            whiteKeyStart={0}
            whiteKeyCount={PIANO_WHITE_KEY_COUNT}
            disabled={disabled}
            activeRangeEdge={activeRangeEdge}
            rangeEndNoteId={rangeEndNoteId}
            rangeNoteIds={rangeNoteIds}
            rangeStartNoteId={rangeStartNoteId}
            selectableKeyIds={selectableKeyIds}
            selectedNoteId={selectedNoteId}
            revealedNoteId={revealedNoteId}
            isCorrect={isCorrect}
            onKeySelect={handleKeySelect}
          />
        )}
      </div>
    </div>
  );
}

export default PianoKeyboard;
