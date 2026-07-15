import { useMemo, useState } from "react";
import { PIANO_KEYS, PITCH_RANGES, getPitchRange, normalizeCustomPitchRange } from "../noteData";
import type { CustomPitchRange, MelodyLength, PitchExercise, PitchRange, PracticeSettings } from "../types";
import PianoKeyboard from "./PianoKeyboard";

const MELODY_LENGTHS: MelodyLength[] = [3, 4, 5];

type PitchTrainingControlsProps = {
  settings: PracticeSettings;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
};

function PitchTrainingControls({ settings, onSettingsChange }: PitchTrainingControlsProps) {
  const [customRangeEdge, setCustomRangeEdge] = useState<"start" | "end">("start");
  const normalizedCustomRange = useMemo(
    () => normalizeCustomPitchRange(settings.customPitchRange),
    [settings.customPitchRange],
  );
  const pitchRange = useMemo(
    () => getPitchRange(settings.pitchRange, normalizedCustomRange),
    [normalizedCustomRange, settings.pitchRange],
  );
  const allPitchKeyIds = useMemo(() => new Set(PIANO_KEYS.map((key) => key.id)), []);
  const customRangeNoteIds = useMemo(() => new Set(pitchRange.notes.map((note) => note.id)), [pitchRange.notes]);

  function selectExercise(pitchExercise: PitchExercise) {
    onSettingsChange({ pitchExercise });
  }

  function selectRange(pitchRange: PitchRange) {
    onSettingsChange({ pitchRange });
  }

  function handleCustomRangeKeySelect(noteId: string) {
    const nextRange: CustomPitchRange = normalizeCustomPitchRange(
      customRangeEdge === "start"
        ? { ...normalizedCustomRange, startNoteId: noteId }
        : { ...normalizedCustomRange, endNoteId: noteId },
    );

    onSettingsChange({ customPitchRange: nextRange, pitchRange: "custom" });
    setCustomRangeEdge((edge) => (edge === "start" ? "end" : "start"));
  }

  return (
    <div className="pitch-training-controls">
      <div className="pitch-exercise-row">
        <div className="pitch-exercise-switch" aria-label="Pitch exercise">
          <button
            type="button"
            aria-pressed={settings.pitchExercise === "single"}
            className={settings.pitchExercise === "single" ? "active" : ""}
            onClick={() => selectExercise("single")}
          >
            Single note
          </button>
          <button
            type="button"
            aria-pressed={settings.pitchExercise === "melody"}
            className={settings.pitchExercise === "melody" ? "active" : ""}
            onClick={() => selectExercise("melody")}
          >
            Melody
          </button>
        </div>

        {settings.pitchExercise === "melody" && (
          <div className="melody-length-switch" aria-label="Melody length">
            {MELODY_LENGTHS.map((length) => (
              <button
                type="button"
                key={length}
                aria-pressed={settings.melodyLength === length}
                className={settings.melodyLength === length ? "active" : ""}
                onClick={() => onSettingsChange({ melodyLength: length })}
              >
                {length} notes
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pitch-range-switch" aria-label="Pitch drill range">
        {PITCH_RANGES.map((range) => (
          <button
            type="button"
            key={range.id}
            aria-pressed={settings.pitchRange === range.id}
            className={settings.pitchRange === range.id ? "active" : ""}
            onClick={() => selectRange(range.id)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {settings.pitchRange === "custom" && (
        <div className="custom-range-card range-card">
          <div className="custom-range-heading">
            <div>
              <span>{pitchRange.detail} - </span>
              <strong>{pitchRange.notes.length} keys</strong>
            </div>
            <div className="range-edge-switch" aria-label="Custom pitch range endpoint">
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
            selectableKeyIds={allPitchKeyIds}
            onKeySelect={handleCustomRangeKeySelect}
          />
        </div>
      )}
    </div>
  );
}

export default PitchTrainingControls;
