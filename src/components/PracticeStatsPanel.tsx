import { useRef, type ChangeEvent } from "react";
import { READING_RANGES, getReadingRange } from "../noteData";
import { ROUND_LENGTHS } from "../practiceEngine";
import type {
  DataStatus,
  MasterySummary,
  ModeProgress,
  PitchNote,
  PracticeMode,
  PracticeSettings,
  PracticeInsightSummary,
  PracticePlan,
  SessionHistorySummary,
  SessionSummary,
  TrainingNote,
} from "../types";
import MasteryMap from "./MasteryMap";
import PracticeCoach from "./PracticeCoach";
import PracticeInsights from "./PracticeInsights";
import SessionHistory from "./SessionHistory";
import StatTile from "./StatTile";

type FocusItem = {
  note: TrainingNote | PitchNote;
  accuracy: number;
  attempts: number;
};

type PracticeStatsPanelProps = {
  activeProgress: ModeProgress;
  focusItems: FocusItem[];
  historySummary: SessionHistorySummary;
  insightSummary: PracticeInsightSummary;
  lastSummary: SessionSummary | null;
  lifetimeAccuracy: string;
  masterySummary: MasterySummary;
  mode: PracticeMode;
  modeLabel: string;
  practicePlan: PracticePlan;
  settings: PracticeSettings;
  dataStatus: DataStatus;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetProgress: () => void;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
};

function PracticeStatsPanel({
  activeProgress,
  focusItems,
  historySummary,
  insightSummary,
  lastSummary,
  lifetimeAccuracy,
  masterySummary,
  mode,
  modeLabel,
  practicePlan,
  settings,
  dataStatus,
  onExportData,
  onImportData,
  onResetProgress,
  onSettingsChange,
}: PracticeStatsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const readingRange = getReadingRange(settings.readingRange);

  function handleImportInputChange(event: ChangeEvent<HTMLInputElement>) {
    const importFile = event.currentTarget.files?.[0];

    if (importFile) {
      onImportData(importFile);
    }

    event.currentTarget.value = "";
  }

  return (
    <aside className="stats-panel" aria-label="Practice progress">
      <div className="panel-heading">
        <p className="eyebrow">Saved locally</p>
        <h2>{modeLabel}</h2>
      </div>

      <div className="lifetime-grid">
        <StatTile label="Attempts" value={activeProgress.totalAttempts} />
        <StatTile label="Correct" value={activeProgress.totalCorrect} />
        <StatTile label="Accuracy" value={lifetimeAccuracy} />
        <StatTile label="Best" value={activeProgress.bestRoundScore} />
      </div>

      {lastSummary && lastSummary.mode === mode && (
        <div className="summary-card" aria-live="polite">
          <h3>Last round</h3>
          <div className="summary-grid">
            <StatTile label="Score" value={`${lastSummary.score}/${lastSummary.attempts}`} />
            <StatTile label="Accuracy" value={`${lastSummary.accuracy}%`} />
            <StatTile label="Best streak" value={lastSummary.bestStreak} />
          </div>
          <p>{lastSummary.suggestion}</p>
        </div>
      )}

      <SessionHistory modeLabel={modeLabel} summary={historySummary} />
      <PracticeInsights modeLabel={modeLabel} summary={insightSummary} />
      <PracticeCoach mode={mode} modeLabel={modeLabel} plan={practicePlan} />
      <MasteryMap mode={mode} modeLabel={modeLabel} summary={masterySummary} />

      <div className="settings-card">
        <h3>Drill settings</h3>
        <div className="setting-row">
          <span>Reading range</span>
          <div className="range-options" aria-label="Reading range">
            {READING_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                aria-pressed={settings.readingRange === range.id}
                className={settings.readingRange === range.id ? "active" : ""}
                onClick={() => onSettingsChange({ readingRange: range.id })}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

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

      <div className="weak-notes">
        <h3>{mode === "reading" ? "Focus notes" : "Focus pitches"}</h3>
        {focusItems.length === 0 ? (
          <p className="empty-state">Finish a few questions and NoteSense will show what needs extra attention.</p>
        ) : (
          <ul>
            {focusItems.map(({ note, accuracy, attempts }) => (
              <li key={note.id}>
                <span>{note.id}</span>
                <div className="meter" aria-hidden="true">
                  <span style={{ width: `${accuracy}%` }} />
                </div>
                <strong>{accuracy}%</strong>
                <em>{attempts} tries</em>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="range-card">
        <h3>Starter range</h3>
        <p>
          {mode === "reading"
            ? `${readingRange.detail} note reading.`
            : "Pitch recognition across one natural-note octave from C4 to B4."}
        </p>
      </div>

      <div className="data-card">
        <h3>Data</h3>
        {dataStatus && (
          <p className={`data-status ${dataStatus.tone}`} role="status">
            {dataStatus.message}
          </p>
        )}
        <div className="data-actions">
          <button className="secondary-button" type="button" onClick={onExportData}>
            Export data
          </button>
          <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}>
            Import data
          </button>
          <input
            ref={importInputRef}
            aria-label="Import data file"
            className="file-input"
            type="file"
            tabIndex={-1}
            accept="application/json,.json"
            onChange={handleImportInputChange}
          />
          <button className="ghost-button" type="button" onClick={onResetProgress}>
            Reset progress
          </button>
        </div>
      </div>
    </aside>
  );
}

export default PracticeStatsPanel;
