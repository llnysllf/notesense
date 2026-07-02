import type { ReactNode } from "react";
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

export type PracticePanelView = "overview" | "map" | "history" | "settings" | "data";

type PracticeStatsPanelProps = {
  activeProgress: ModeProgress;
  activeView: PracticePanelView;
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
  readingRangeControls?: ReactNode;
  settings: PracticeSettings;
  dataStatus: DataStatus;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetProgress: () => void;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
};

function PracticeStatsPanel({
  activeProgress,
  activeView,
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
  readingRangeControls,
  settings,
  dataStatus,
  onExportData,
  onImportData,
  onResetProgress,
  onSettingsChange,
}: PracticeStatsPanelProps) {
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
            readingRangeControls={readingRangeControls}
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
