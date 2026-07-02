import { useCallback, useMemo, useState } from "react";
import AppSectionNav from "./components/AppSectionNav";
import type { AppSection } from "./components/AppSectionNav";
import PracticeStatsPanel from "./components/PracticeStatsPanel";
import type { PracticePanelView } from "./components/PracticeStatsPanel";
import PracticeWorkspace from "./components/PracticeWorkspace";
import ReadingRangeSelector from "./components/ReadingRangeSelector";
import { useDataPortability } from "./hooks/useDataPortability";
import { usePracticeProgress } from "./hooks/usePracticeProgress";
import { usePracticeSession } from "./hooks/usePracticeSession";
import { useSettings } from "./hooks/useSettings";
import { getReadingRange, normalizeCustomReadingRange } from "./noteData";
import {
  formatAccuracy,
  getDailyGoalSummary,
  getFocusItems,
  getMasterySummary,
  getModeLabel,
  getPracticeInsightSummary,
  getPracticePlan,
  getSessionHistorySummary,
} from "./practiceEngine";
import { resetProgress } from "./storage";
import type { CustomReadingRange, DataStatus, PracticeProgress, PracticeSettings, ReadingRange } from "./types";

const STORAGE_WARNING = "Progress is not being saved on this device right now.";
const STATS_SECTION_BY_APP_SECTION: Record<Exclude<AppSection, "practice">, PracticePanelView> = {
  progress: "overview",
  map: "map",
  history: "history",
  settings: "settings",
  data: "data",
};

function getStatsView(section: AppSection): PracticePanelView {
  if (section === "practice") return "overview";

  return STATS_SECTION_BY_APP_SECTION[section];
}

const shouldForceRenderError = () =>
  import.meta.env.MODE === "resilience" && window.sessionStorage.getItem("notesense.forceRenderError") === "true";

function App() {
  if (shouldForceRenderError()) {
    throw new Error("Forced NoteSense render failure");
  }

  const [dataStatus, setDataStatus] = useState<DataStatus>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("practice");

  const { settings, setSettings, persistSettings } = useSettings();
  const { progress, setProgress, persistProgress } = usePracticeProgress();

  const handleProgressChange = useCallback(
    (next: PracticeProgress) => {
      setProgress(next);
      if (!persistProgress(next)) setDataStatus({ message: STORAGE_WARNING, tone: "warning" });
    },
    [persistProgress, setProgress],
  );

  const session = usePracticeSession({ settings, progress, onProgressChange: handleProgressChange });

  const { handleExportData, handleImportData } = useDataPortability({
    progress,
    settings,
    onImport: (nextProgress, nextSettings) => {
      setProgress(nextProgress);
      setSettings(nextSettings);
      session.resetSession(nextSettings, nextProgress);
    },
    onStatusChange: (message, tone) => setDataStatus({ message, tone }),
  });

  const {
    mode,
    setPracticeMode,
    currentReadingNote,
    currentPitchNote,
    feedback,
    timeRemaining,
    roundAttempts,
    roundCorrect,
    currentStreak,
    isRunning,
    lastSummary,
    startRound,
    finishRound,
    handleAnswer,
    handleReadingKeyAnswer,
    playCurrentNote,
  } = session;

  function updateSettings(patch: Partial<PracticeSettings>) {
    const next = { ...settings, ...patch };
    const readingRangeChanged = patch.readingRange !== undefined && patch.readingRange !== settings.readingRange;
    const customRangeChanged =
      patch.customReadingRange !== undefined &&
      (patch.customReadingRange.startNoteId !== settings.customReadingRange.startNoteId ||
        patch.customReadingRange.endNoteId !== settings.customReadingRange.endNoteId);

    if (!persistSettings(next)) setDataStatus({ message: STORAGE_WARNING, tone: "warning" });
    setSettings(next);
    if (!isRunning && patch.roundLength !== undefined) session.setTimeRemaining(patch.roundLength);
    if (readingRangeChanged || customRangeChanged) {
      session.resetSession(next, progress);
    }
  }

  function handleReadingRangeChange(readingRange: ReadingRange) {
    updateSettings({ readingRange });
  }

  function handleCustomReadingRangeChange(customReadingRange: CustomReadingRange) {
    updateSettings({ customReadingRange, readingRange: "custom" });
  }

  function handleResetProgress() {
    if (!window.confirm("Reset all saved NoteSense progress?")) return;
    const next = resetProgress();
    if (!persistProgress(next)) setDataStatus({ message: STORAGE_WARNING, tone: "warning" });
    setProgress(next);
    session.resetSession(settings, next);
  }

  const activeProgress = progress[mode];
  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
  const roundAccuracy = formatAccuracy(roundCorrect, roundAttempts);
  const lifetimeAccuracy = formatAccuracy(activeProgress.totalCorrect, activeProgress.totalAttempts);
  const modeLabel = getModeLabel(mode);
  const normalizedCustomRange = useMemo(
    () => normalizeCustomReadingRange(settings.customReadingRange),
    [settings.customReadingRange],
  );
  const readingRange = useMemo(
    () => getReadingRange(settings.readingRange, normalizedCustomRange),
    [normalizedCustomRange, settings.readingRange],
  );
  const focusItems = useMemo(
    () => getFocusItems(mode, progress[mode], settings.readingRange, normalizedCustomRange),
    [mode, normalizedCustomRange, progress, settings.readingRange],
  );
  const masterySummary = useMemo(
    () => getMasterySummary(mode, progress[mode], settings.readingRange, normalizedCustomRange),
    [mode, normalizedCustomRange, progress, settings.readingRange],
  );
  const dailyGoalSummary = useMemo(() => getDailyGoalSummary(progress.history), [progress.history]);
  const historySummary = useMemo(() => getSessionHistorySummary(progress.history, mode), [mode, progress.history]);
  const insightSummary = useMemo(() => getPracticeInsightSummary(progress.history, mode), [mode, progress.history]);
  const practicePlan = useMemo(
    () =>
      getPracticePlan({
        adaptivePractice: settings.adaptivePractice,
        customReadingRange: normalizedCustomRange,
        mode,
        progress,
        readingRange: settings.readingRange,
        roundLength: settings.roundLength,
      }),
    [mode, normalizedCustomRange, progress, settings.adaptivePractice, settings.readingRange, settings.roundLength],
  );
  const promptDetail =
    mode === "reading"
      ? `${settings.adaptivePractice ? "Adaptive" : "Random"} | ${readingRange.detail}`
      : `${settings.adaptivePractice ? "Adaptive" : "Random"} | Natural notes C4-B4`;

  const feedbackClass = feedback ? (feedback.isCorrect ? "correct" : "wrong") : "";
  const shouldRevealPitch = Boolean(feedback) && settings.revealPitchAfterAnswer;
  const sessionStateLabel = isRunning ? "Live round" : lastSummary?.mode === mode ? "Round saved" : "Ready";
  const sessionStateTone = isRunning ? "live" : lastSummary?.mode === mode ? "saved" : "";
  const replayButtonLabel = mode === "reading" ? "Play note" : "Replay pitch";
  const activeStatsView = getStatsView(activeSection);
  const readingRangeControls =
    mode === "reading" ? (
      <ReadingRangeSelector
        settings={settings}
        onCustomRangeChange={handleCustomReadingRangeChange}
        onRangeChange={handleReadingRangeChange}
      />
    ) : null;

  function getFeedbackText() {
    if (!feedback) return isRunning ? "Listening" : "Ready";
    if (feedback.isCorrect) return "Correct";
    if (mode === "pitch" && !settings.revealPitchAfterAnswer) return "Try the next one";
    return `It was ${activeNote.id}`;
  }

  return (
    <main
      className={`app-shell app-section-${activeSection} ${mode === "reading" ? "reading-layout" : "pitch-layout"}`}
    >
      <section className="app-header-panel" aria-labelledby="app-title">
        <header className="topbar">
          <div className="brand-lockup">
            <p className="eyebrow">Adaptive sight reading + ear training</p>
            <h1 id="app-title">NoteSense</h1>
            <p className="app-subtitle">{mode === "reading" ? readingRange.detail : "Natural notes C4-B4"}</p>
          </div>
          <div className="topbar-actions">
            <span className={`session-pill ${sessionStateTone}`} aria-live="polite">
              <span aria-hidden="true" />
              {sessionStateLabel}
            </span>
            <button className="secondary-button" type="button" onClick={playCurrentNote}>
              {replayButtonLabel}
            </button>
          </div>
        </header>

        <AppSectionNav activeSection={activeSection} onSectionChange={setActiveSection} />

        {activeSection === "practice" && dataStatus && (
          <p className={`data-status ${dataStatus.tone}`} role="status">
            {dataStatus.message}
          </p>
        )}
      </section>

      {activeSection === "practice" ? (
        <PracticeWorkspace
          currentPitchNote={currentPitchNote}
          currentReadingNote={currentReadingNote}
          currentStreak={currentStreak}
          feedback={feedback}
          feedbackClass={feedbackClass}
          feedbackText={getFeedbackText()}
          isRunning={isRunning}
          keyboardResetKey={`${settings.readingRange}-${normalizedCustomRange.startNoteId}-${normalizedCustomRange.endNoteId}`}
          mode={mode}
          promptDetail={promptDetail}
          rangeControls={readingRangeControls}
          roundAccuracy={roundAccuracy}
          roundAttempts={roundAttempts}
          roundCorrect={roundCorrect}
          shouldRevealPitch={shouldRevealPitch}
          timeRemaining={timeRemaining}
          onAnswer={handleAnswer}
          onFinishRound={finishRound}
          onModeChange={setPracticeMode}
          onReadingKeyAnswer={handleReadingKeyAnswer}
          onStartRound={startRound}
        />
      ) : (
        <PracticeStatsPanel
          activeProgress={activeProgress}
          activeView={activeStatsView}
          dailyGoalSummary={dailyGoalSummary}
          dataStatus={dataStatus}
          focusItems={focusItems}
          historySummary={historySummary}
          insightSummary={insightSummary}
          lastSummary={lastSummary}
          lifetimeAccuracy={lifetimeAccuracy}
          masterySummary={masterySummary}
          mode={mode}
          modeLabel={modeLabel}
          practicePlan={practicePlan}
          readingRangeControls={readingRangeControls}
          settings={settings}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onResetProgress={handleResetProgress}
          onSettingsChange={updateSettings}
        />
      )}
    </main>
  );
}

export default App;
