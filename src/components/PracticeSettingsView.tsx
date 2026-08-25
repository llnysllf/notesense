import { useState, type FormEvent, type ReactNode } from "react";
import { ROUND_LENGTHS } from "../practiceEngine";
import { MAX_ROUND_LENGTH_SECONDS, MIN_ROUND_LENGTH_SECONDS } from "../storage";
import MidiSettings from "./MidiSettings";
import SoundWorldPicker from "./SoundWorldPicker";
import type { MidiPanelProps } from "../midi/webMidi";
import type { PracticeMode, PracticeSettings, SoundWorldView } from "../types";

type PracticeSettingsViewProps = {
  mode: PracticeMode;
  rangeDetail: string;
  rangeControls?: ReactNode;
  settings: PracticeSettings;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
  midi: MidiPanelProps;
  sound: SoundWorldView;
};

function PracticeSettingsView({
  mode,
  rangeDetail,
  rangeControls,
  settings,
  onSettingsChange,
  midi,
  sound,
}: PracticeSettingsViewProps) {
  const [customSeconds, setCustomSeconds] = useState(() => String(settings.roundLength || 60));

  function applyCustomLength(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedSeconds = Number(customSeconds);
    if (!Number.isFinite(requestedSeconds)) return;
    const roundLength = Math.min(
      MAX_ROUND_LENGTH_SECONDS,
      Math.max(MIN_ROUND_LENGTH_SECONDS, Math.round(requestedSeconds)),
    );
    setCustomSeconds(String(roundLength));
    onSettingsChange({ roundLength });
  }

  return (
    <>
      <MidiSettings {...midi} />

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
                onClick={() => {
                  if (length !== 0) setCustomSeconds(String(length));
                  onSettingsChange({ roundLength: length });
                }}
              >
                {length === 0 ? "Until I stop" : `${length}s`}
              </button>
            ))}
          </div>
          <form className="custom-duration" onSubmit={applyCustomLength}>
            <label htmlFor="custom-round-seconds">Custom time</label>
            <div>
              <input
                id="custom-round-seconds"
                type="number"
                min={MIN_ROUND_LENGTH_SECONDS}
                max={MAX_ROUND_LENGTH_SECONDS}
                step="1"
                inputMode="numeric"
                value={customSeconds}
                onChange={(event) => setCustomSeconds(event.currentTarget.value)}
              />
              <span>seconds</span>
              <button className="secondary-button" type="submit">
                Use time
              </button>
            </div>
          </form>
          <p className="setting-help">“Until I stop” keeps the drill going until you finish it yourself.</p>
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

      <SoundWorldPicker sound={sound} />

      <div className="range-card">
        <h3>Active range</h3>
        <p>{mode === "reading" ? `${rangeDetail} note reading.` : `${rangeDetail} pitch recognition.`}</p>
      </div>
    </>
  );
}

export default PracticeSettingsView;
