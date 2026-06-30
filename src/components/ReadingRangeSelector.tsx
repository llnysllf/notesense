import { useMemo, useState } from "react";
import {
  CUSTOM_READING_KEY_IDS,
  READING_RANGES,
  getCustomReadingNotes,
  getReadingRange,
  normalizeCustomReadingRange,
} from "../noteData";
import type { CustomReadingRange, PracticeSettings, ReadingRange } from "../types";
import PianoKeyboard from "./PianoKeyboard";

type ReadingRangeSelectorProps = {
  settings: PracticeSettings;
  onCustomRangeChange: (customReadingRange: CustomReadingRange) => void;
  onRangeChange: (readingRange: ReadingRange) => void;
};

function ReadingRangeSelector({ settings, onCustomRangeChange, onRangeChange }: ReadingRangeSelectorProps) {
  const [customRangeEdge, setCustomRangeEdge] = useState<"start" | "end">("start");
  const normalizedCustomRange = useMemo(
    () => normalizeCustomReadingRange(settings.customReadingRange),
    [settings.customReadingRange],
  );
  const readingRange = useMemo(
    () => getReadingRange(settings.readingRange, normalizedCustomRange),
    [normalizedCustomRange, settings.readingRange],
  );
  const customReadingNotes = useMemo(() => getCustomReadingNotes(normalizedCustomRange), [normalizedCustomRange]);
  const customRangeKeyIds = useMemo(() => new Set(CUSTOM_READING_KEY_IDS), []);
  const customRangeNoteIds = useMemo(() => new Set(customReadingNotes.map((note) => note.id)), [customReadingNotes]);

  function handleCustomRangeKeySelect(noteId: string) {
    if (!CUSTOM_READING_KEY_IDS.includes(noteId)) return;

    const nextCustomRange = normalizeCustomReadingRange(
      customRangeEdge === "start"
        ? { ...normalizedCustomRange, startNoteId: noteId }
        : { ...normalizedCustomRange, endNoteId: noteId },
    );

    onCustomRangeChange(nextCustomRange);
    setCustomRangeEdge((edge) => (edge === "start" ? "end" : "start"));
  }

  return (
    <>
      <div className="reading-range-switch" aria-label="Reading drill range">
        {READING_RANGES.map((range) => (
          <button
            key={range.id}
            type="button"
            aria-pressed={settings.readingRange === range.id}
            className={settings.readingRange === range.id ? "active" : ""}
            onClick={() => onRangeChange(range.id)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {settings.readingRange === "custom" && (
        <div className="custom-range-card range-card">
          <div className="custom-range-heading">
            <div>
              <span>{readingRange.detail} - </span>
              <strong>{customReadingNotes.length} notes</strong>
            </div>
            <div className="range-edge-switch" aria-label="Custom range endpoint">
              <button
                type="button"
                aria-pressed={customRangeEdge === "start"}
                className={customRangeEdge === "start" ? "active" : ""}
                onClick={() => setCustomRangeEdge("start")}
              >
                Start {normalizedCustomRange.startNoteId}
              </button>
              <button
                type="button"
                aria-pressed={customRangeEdge === "end"}
                className={customRangeEdge === "end" ? "active" : ""}
                onClick={() => setCustomRangeEdge("end")}
              >
                End {normalizedCustomRange.endNoteId}
              </button>
            </div>
          </div>
          <PianoKeyboard
            activeRangeEdge={customRangeEdge}
            disabled={false}
            rangeEndNoteId={normalizedCustomRange.endNoteId}
            rangeNoteIds={customRangeNoteIds}
            rangeStartNoteId={normalizedCustomRange.startNoteId}
            selectableKeyIds={customRangeKeyIds}
            onKeySelect={handleCustomRangeKeySelect}
          />
        </div>
      )}
    </>
  );
}

export default ReadingRangeSelector;
