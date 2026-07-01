import { useState } from "react";
import { getReadingRange } from "../noteData";
import type {
  DataStatus,
  DailyGoalSummary,
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
import DailyGoal from "./DailyGoal";
import MasteryMap from "./MasteryMap";
import PracticeDataView from "./PracticeDataView";
import PracticeCoach from "./PracticeCoach";
import PracticeInsights from "./PracticeInsights";
import PracticeSettingsView from "./PracticeSettingsView";
import SessionHistory from "./SessionHistory";
import StatTile from "./StatTile";

type FocusItem = {
  note: TrainingNote | PitchNote;
  accuracy: number;
  attempts: number;
};

type PanelView = "overview" | "map" | "history" | "settings" | "data";

const PANEL_VIEWS: Array<{ id: PanelView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "map", label: "Map" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "data", label: "Data" },
];

type PracticeStatsPanelProps = {
  activeProgress: ModeProgress;
  dailyGoalSummary: DailyGoalSummary;
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
  dailyGoalSummary,
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
  const [activeView, setActiveView] = useState<PanelView>("overview");
  const readingRange = getReadingRange(settings.readingRange, settings.customReadingRange);

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

      <div className="panel-tabs" aria-label="Progress views">
        {PANEL_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={activeView === view.id}
            className={activeView === view.id ? "active" : ""}
            onClick={() => setActiveView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>

      {dataStatus && (
        <p className={`data-status ${dataStatus.tone}`} role="status">
          {dataStatus.message}
        </p>
      )}

      <div className="stats-view">
        {activeView === "overview" && (
          <>
            <DailyGoal summary={dailyGoalSummary} />

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

            <PracticeCoach mode={mode} modeLabel={modeLabel} plan={practicePlan} />

            <div className="weak-notes">
              <h3>{mode === "reading" ? "Focus notes" : "Focus pitches"}</h3>
              {focusItems.length === 0 ? (
                <p className="empty-state">
                  Finish a few questions and NoteSense will show what needs extra attention.
                </p>
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
          </>
        )}

        {activeView === "map" && <MasteryMap mode={mode} modeLabel={modeLabel} summary={masterySummary} />}

        {activeView === "history" && (
          <>
            <SessionHistory modeLabel={modeLabel} summary={historySummary} />
            <PracticeInsights modeLabel={modeLabel} summary={insightSummary} />
          </>
        )}

        {activeView === "settings" && (
          <PracticeSettingsView
            mode={mode}
            rangeDetail={readingRange.detail}
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        )}

        {activeView === "data" && (
          <PracticeDataView onExportData={onExportData} onImportData={onImportData} onResetProgress={onResetProgress} />
        )}
      </div>
    </aside>
  );
}

export default PracticeStatsPanel;
