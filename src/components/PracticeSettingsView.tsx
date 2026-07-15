import type { ReactNode } from "react";
import { ROUND_LENGTHS } from "../practiceEngine";
import type { PracticeMode, PracticeSettings } from "../types";

type PracticeSettingsViewProps = {
  mode: PracticeMode;
  rangeDetail: string;
  rangeControls?: ReactNode;
  settings: PracticeSettings;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
};

function PracticeSettingsView({
  mode,
  rangeDetail,
  rangeControls,
  settings,
  onSettingsChange,
}: PracticeSettingsViewProps) {
  return (
    <>
      {rangeControls && (
        <div className="range-group">
          <h3>{mode === "reading" ? "Reading range" : "Pitch training"}</h3>
          {rangeControls}
        </div>
      )}

      <div className="settings-card">
        <h3>Drill settings</h3>
        <div className="setting-row">
          <span>Round length</span>
          <div className="length-options" aria-label="Round length">
            {ROUND_LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                aria-pressed={settings.roundLength === length}
                className={settings.roundLength === length ? "active" : ""}
                onClick={() => onSettingsChange({ roundLength: length })}
              >
                {length}s
              </button>
            ))}
          </div>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.adaptivePractice}
            onChange={(event) => onSettingsChange({ adaptivePractice: event.currentTarget.checked })}
          />
          <span>Adaptive practice</span>
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.autoPlayPitch}
            onChange={(event) => onSettingsChange({ autoPlayPitch: event.currentTarget.checked })}
          />
          <span>Auto-play pitch</span>
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.revealPitchAfterAnswer}
            onChange={(event) => onSettingsChange({ revealPitchAfterAnswer: event.currentTarget.checked })}
          />
          <span>Reveal pitch answer</span>
        </label>
      </div>

      <div className="range-card">
        <h3>Active range</h3>
        <p>{mode === "reading" ? `${rangeDetail} note reading.` : `${rangeDetail} pitch recognition.`}</p>
      </div>
    </>
  );
}

export default PracticeSettingsView;
