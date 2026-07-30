import ReadingModeSelector from "./ReadingModeSelector";
import ReadingRangeSelector from "./ReadingRangeSelector";
import {
  getReadingModeRules,
  type CustomReadingRange,
  type PracticeSettings,
  type ReadingMode,
  type ReadingRange,
} from "../types";

// The controls above a reading drill: how you want to work, and on which notes.
//
// The range picker is hidden in Test mode on purpose. A test is only comparable
// between sittings if everyone takes it over the same notes, so letting the
// learner narrow the range would quietly invalidate the result.

type ReadingControlsProps = {
  settings: PracticeSettings;
  onModeChange: (mode: ReadingMode) => void;
  onRangeChange: (range: ReadingRange) => void;
  onCustomRangeChange: (range: CustomReadingRange) => void;
};

function ReadingControls({ settings, onModeChange, onRangeChange, onCustomRangeChange }: ReadingControlsProps) {
  const rules = getReadingModeRules(settings.readingMode);

  return (
    <div className="reading-controls">
      <ReadingModeSelector mode={settings.readingMode} onModeChange={onModeChange} />
      {rules.unseenMaterial ? (
        <p className="reading-fixed-range" role="note">
          Fixed notes compare attempts.
        </p>
      ) : (
        <ReadingRangeSelector
          settings={settings}
          onCustomRangeChange={onCustomRangeChange}
          onRangeChange={onRangeChange}
        />
      )}
    </div>
  );
}

export default ReadingControls;
