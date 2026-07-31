import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import AppSectionNav from "./components/AppSectionNav";
import AppTopbar from "./components/AppTopbar";
import ErrorBoundary from "./components/ErrorBoundary";
import type { PracticePanelView } from "./components/PracticeStatsPanel";
import PitchTrainingControls from "./components/PitchTrainingControls";
import ReadingControls from "./components/ReadingControls";
import { useAppRoute } from "./hooks/useAppRoute";
import { useRhythmDrill } from "./hooks/useRhythmDrill";
import { useRoundMisses } from "./hooks/useRoundMisses";
import { useDailyPlan } from "./hooks/useDailyPlan";
import { useDataPortability } from "./hooks/useDataPortability";
import { usePlanCompletion } from "./hooks/usePlanCompletion";
import { usePracticeDashboard } from "./hooks/usePracticeDashboard";
import { useSongSession } from "./hooks/useSongSession";
import { usePracticeProgress } from "./hooks/usePracticeProgress";
import { usePracticeSession } from "./hooks/usePracticeSession";
import { useSettings } from "./hooks/useSettings";
import type { AppSection } from "./routes";
import { getPracticeFeedbackText } from "./practiceFeedback";
import { requiresSessionReset } from "./settingsChange";
import { resetProgress } from "./storage";
import type { CustomReadingRange, DataStatus, PracticeProgress, PracticeSettings, ReadingRange } from "./types";

const STORAGE_WARNING = "Progress is not being saved on this device right now.";
const PracticeStatsPanel = lazy(() => import("./components/PracticeStatsPanel"));
const SongsWorkspace = lazy(() => import("./components/SongsWorkspace"));
const TodayWorkspace = lazy(() => import("./components/TodayWorkspace"));
const RhythmWorkspace = lazy(() => import("./components/RhythmWorkspace"));
const PracticeWorkspace = lazy(() => import("./components/PracticeWorkspace"));
const RouteNotFound = lazy(() => import("./components/RouteNotFound"));
const STATS_SECTION_BY_APP_SECTION: Record<
  Exclude<AppSection, "today" | "practice" | "rhythm" | "songs">,
  PracticePanelView
> = {
  progress: "overview",
  map: "map",
  history: "history",
  settings: "settings",
  data: "data",
};

function getStatsView(section: AppSection): PracticePanelView {
  if (section === "today" || section === "practice" || section === "rhythm" || section === "songs") return "overview";

  return STATS_SECTION_BY_APP_SECTION[section];
}

const shouldForceRenderError = () =>
  import.meta.env.MODE === "resilience" && window.sessionStorage.getItem("notesense.forceRenderError") === "true";

function App() {
  if (shouldForceRenderError()) {
    throw new Error("Forced NoteSense render failure");
  }

  const [dataStatus, setDataStatus] = useState<DataStatus>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  // The URL owns which destination is showing, so reloads, bookmarks, and
  // browser back/forward all land on the same screen.
  const { route, isUnknownPath } = useAppRoute();
  const activeSection = route.section;

  const { settings, setSettings, persistSettings } = useSettings();
  const rhythmDrill = useRhythmDrill();
  const songSession = useSongSession();
  const { progress, evidenceEvents, setProgress, persistProgress } = usePracticeProgress();
  const dailyPlan = useDailyPlan(evidenceEvents);

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
    lookAheadReadingNote,
    currentPitchNote,
    currentMelody,
    melodyAnswerNoteIds,
    feedback,
    timeRemaining,
    roundAttempts,
    roundCorrect,
    currentStreak,
    isRunning,
    lastSummary,
    startRound,
    startReplay,
    finishRound,
    handleReadingKeyAnswer,
    handlePitchKeyAnswer,
    handleMelodyNoteInput,
    undoMelodyAnswer,
    clearMelodyAnswer,
    submitMelodyAnswer,
    playCurrentNote,
  } = session;

  function updateSettings(patch: Partial<PracticeSettings>) {
    const next = { ...settings, ...patch };
    if (!persistSettings(next)) setDataStatus({ message: STORAGE_WARNING, tone: "warning" });
    setSettings(next);
    if (!isRunning && patch.roundLength !== undefined) session.setTimeRemaining(patch.roundLength);
    if (requiresSessionReset(settings, patch)) session.resetSession(next, progress);
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

  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
  const { misses } = useRoundMisses({ mode, feedback, expectedNoteId: activeNote.id, isRunning });
  const {
    activeProgress,
    dailyGoalSummary,
    focusItems,
    historySummary,
    insightSummary,
    lifetimeAccuracy,
    masterySummary,
    modeLabel,
    normalizedCustomPitchRange,
    normalizedCustomRange,
    pitchRange,
    pitchRangeNoteIds,
    practicePlan,
    promptDetail,
    readingRange,
    roundAccuracy,
  } = usePracticeDashboard({ mode, progress, roundAttempts, roundCorrect, settings });

  // The reading/pitch drills are separate destinations, so the practice mode
  // follows the URL rather than being toggled independently of it.
  useEffect(() => {
    if (route.mode && route.mode !== mode) setPracticeMode(route.mode);
  }, [mode, route.mode, setPracticeMode]);

  const handleNavigated = useCallback(() => setIsNavOpen(false), []);

  // Today never shows progress that was not earned.
  usePlanCompletion({
    lastSummary,
    songStatus: songSession.status,
    completeActivity: dailyPlan.completeActivity,
  });

  const feedbackClass = feedback ? (feedback.isCorrect ? "correct" : "wrong") : "";
  const shouldRevealPitch = Boolean(feedback) && settings.revealPitchAfterAnswer;
  const sessionStateLabel = isRunning ? "Live round" : lastSummary?.mode === mode ? "Round saved" : "Ready";
  const sessionStateTone = isRunning ? "live" : lastSummary?.mode === mode ? "saved" : "";
  const replayButtonLabel =
    mode === "reading" ? "Play note" : settings.pitchExercise === "melody" ? "Replay sequence" : "Replay pitch";
  const activeStatsView = getStatsView(activeSection);
  const rangeControls =
    mode === "reading" ? (
      <ReadingControls
        settings={settings}
        onModeChange={(readingMode) => updateSettings({ readingMode })}
        onCustomRangeChange={handleCustomReadingRangeChange}
        onRangeChange={handleReadingRangeChange}
      />
    ) : (
      <PitchTrainingControls settings={settings} onSettingsChange={updateSettings} />
    );

  const getFeedbackText = () =>
    getPracticeFeedbackText({
      feedback,
      isRunning,
      mode,
      settings,
      activeNoteId: activeNote.id,
      currentMelody,
    });

  return (
    <main
      className={`app-shell app-section-${activeSection} ${mode === "reading" ? "reading-layout" : "pitch-layout"}`}
    >
      <AppSectionNav
        activeRouteId={route.id}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onNavigate={handleNavigated}
      />

      <div className="app-main">
        <AppTopbar
          subtitle={
            activeSection === "practice" ? (mode === "reading" ? readingRange.detail : pitchRange.detail) : route.label
          }
          sessionStateLabel={sessionStateLabel}
          sessionStateTone={sessionStateTone}
          replayButtonLabel={replayButtonLabel}
          isNavOpen={isNavOpen}
          onOpenNav={() => setIsNavOpen(true)}
          onReplay={playCurrentNote}
        />

        <ErrorBoundary resetKey={isUnknownPath ? window.location.pathname : route.id}>
          <Suspense
            fallback={
              <section className="practice-panel" aria-label="Loading section">
                <p role="status">Loading section...</p>
              </section>
            }
          >
            {isUnknownPath ? (
              <RouteNotFound path={window.location.pathname} />
            ) : activeSection === "today" ? (
              <TodayWorkspace plan={dailyPlan.plan} progress={dailyPlan.progress} onOpenBlock={dailyPlan.openBlock} />
            ) : activeSection === "rhythm" ? (
              <RhythmWorkspace
                settings={rhythmDrill.settings}
                session={rhythmDrill.session}
                onSettingsChange={rhythmDrill.updateSettings}
              />
            ) : activeSection === "songs" ? (
              <SongsWorkspace songSession={songSession} />
            ) : activeSection === "practice" ? (
              <PracticeWorkspace
                currentPitchNote={currentPitchNote}
                currentMelody={currentMelody}
                currentReadingNote={currentReadingNote}
                lookAheadReadingNote={lookAheadReadingNote}
                currentStreak={currentStreak}
                dataStatus={dataStatus}
                feedback={feedback}
                feedbackClass={feedbackClass}
                feedbackText={getFeedbackText()}
                isRunning={isRunning}
                keyboardResetKey={`${mode}-${settings.readingRange}-${normalizedCustomRange.startNoteId}-${normalizedCustomRange.endNoteId}-${settings.pitchRange}-${normalizedCustomPitchRange.startNoteId}-${normalizedCustomPitchRange.endNoteId}`}
                melodyAnswerNoteIds={melodyAnswerNoteIds}
                mode={mode}
                pitchExercise={settings.pitchExercise}
                pitchRangeNoteIds={pitchRangeNoteIds}
                promptDetail={promptDetail}
                rangeControls={rangeControls}
                readingMisses={misses}
                roundAccuracy={roundAccuracy}
                roundAttempts={roundAttempts}
                roundCorrect={roundCorrect}
                shouldRevealPitch={shouldRevealPitch}
                timeRemaining={timeRemaining}
                onClearMelodyAnswer={clearMelodyAnswer}
                onFinishRound={finishRound}
                onMelodyNoteInput={handleMelodyNoteInput}
                onPitchKeyAnswer={handlePitchKeyAnswer}
                onReadingKeyAnswer={handleReadingKeyAnswer}
                onStartReplay={startReplay}
                onStartRound={startRound}
                onSubmitMelodyAnswer={submitMelodyAnswer}
                onUndoMelodyAnswer={undoMelodyAnswer}
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
                rangeControls={rangeControls}
                rangeDetail={mode === "reading" ? readingRange.detail : pitchRange.detail}
                settings={settings}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onResetProgress={handleResetProgress}
                onSettingsChange={updateSettings}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </div>
    </main>
  );
}

export default App;
