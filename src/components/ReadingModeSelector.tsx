import { READING_MODE_IDS, getReadingModeRules, type ReadingMode } from "../types";

// Choosing how to work on reading, not just what to read. The summary under the
// buttons is the point: Learn, Practice, and Test differ in ways the learner
// should understand before starting, especially that a test does not help.

type ReadingModeSelectorProps = {
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
};

function ReadingModeSelector({ mode, onModeChange }: ReadingModeSelectorProps) {
  const rules = getReadingModeRules(mode);

  return (
    <div className="reading-mode-selector">
      <div className="mode-switch" role="group" aria-label="Reading mode">
        {READING_MODE_IDS.map((id) => {
          const option = getReadingModeRules(id);
          return (
            <button
              key={id}
              type="button"
              // "Custom" also names a range preset, so the accessible name says
              // which kind of choice this is. It still contains the visible
              // text, so voice control and label-in-name both hold.
              aria-label={`${option.label} mode`}
              aria-pressed={id === mode}
              className={id === mode ? "active" : ""}
              onClick={() => onModeChange(id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="reading-mode-summary">{rules.summary}</p>
    </div>
  );
}

export default ReadingModeSelector;
