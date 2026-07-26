import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import AppSectionNav from "./components/AppSectionNav";
import type { AppSection } from "./components/AppSectionNav";
import AppTopbar from "./components/AppTopbar";
import type { PracticePanelView } from "./components/PracticeStatsPanel";
import PracticeWorkspace from "./components/PracticeWorkspace";
import PitchTrainingControls from "./components/PitchTrainingControls";
import ReadingRangeSelector from "./components/ReadingRangeSelector";
import { useAppRoute } from "./hooks/useAppRoute";
import { useDataPortability } from "./hooks/useDataPortability";
import { usePracticeDashboard } from "./hooks/usePracticeDashboard";
import { useSongSession } from "./hooks/useSongSession";
import { usePracticeProgress } from "./hooks/usePracticeProgress";
import { usePracticeSession } from "./hooks/usePracticeSession";
import { useSettings } from "./hooks/useSettings";
import { resetProgress } from "./storage";
import type { CustomReadingRange, DataStatus, PracticeProgress, PracticeSettings, ReadingRange } from "./types";

const STORAGE_WARNING = "Progress is not being saved on this device right now.";
const PracticeStatsPanel = lazy(() => import("./components/PracticeStatsPanel"));
const SongsWorkspace = lazy(() => import("./components/SongsWorkspace"));
const STATS_SECTION_BY_APP_SECTION: Record<Exclude<AppSection, "practice" | "songs">, PracticePanelView> = {
  progress: "overview",
  map: "map",
  history: "history",
  settings: "settings",
  data: "data",
};

function getStatsView(section: AppSection): PracticePanelView {
  if (section === "practice" || section === "songs") return "overview";

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
  const { route } = useAppRoute();
  const activeSection = route.section;

  const { settings, setSettings, persistSettings } = useSettings();
  const songSession = useSongSession();
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
    const readingRangeChanged = patch.readingRange !== undefined && patch.readingRange !== settings.readingRange;
    const customRangeChanged =
      patch.customReadingRange !== undefined &&
      (patch.customReadingRange.startNoteId !== settings.customReadingRange.startNoteId ||
        patch.customReadingRange.endNoteId !== settings.customReadingRange.endNoteId);
    const pitchRangeChanged = patch.pitchRange !== undefined && patch.pitchRange !== settings.pitchRange;
    const customPitchRangeChanged =
      patch.customPitchRange !== undefined &&
      (patch.customPitchRange.startNoteId !== settings.customPitchRange.startNoteId ||
        patch.customPitchRange.endNoteId !== settings.customPitchRange.endNoteId);
    const pitchExerciseChanged =
      (patch.pitchExercise !== undefined && patch.pitchExercise !== settings.pitchExercise) ||
      (patch.melodyLength !== undefined && patch.melodyLength !== settings.melodyLength);

    if (!persistSettings(next)) setDataStatus({ message: STORAGE_WARNING, tone: "warning" });
    setSettings(next);
    if (!isRunning && patch.roundLength !== undefined) session.setTimeRemaining(patch.roundLength);
    if (
      readingRangeChanged ||
      customRangeChanged ||
      pitchRangeChanged ||
      customPitchRangeChanged ||
      pitchExerciseChanged
    ) {
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

  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
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

  const feedbackClass = feedback ? (feedback.isCorrect ? "correct" : "wrong") : "";
  const shouldRevealPitch = Boolean(feedback) && settings.revealPitchAfterAnswer;
  const sessionStateLabel = isRunning ? "Live round" : lastSummary?.mode === mode ? "Round saved" : "Ready";
  const sessionStateTone = isRunning ? "live" : lastSummary?.mode === mode ? "saved" : "";
  const replayButtonLabel =
    mode === "reading" ? "Play note" : settings.pitchExercise === "melody" ? "Replay sequence" : "Replay pitch";
  const activeStatsView = getStatsView(activeSection);
  const rangeControls =
    mode === "reading" ? (
      <ReadingRangeSelector
        settings={settings}
        onCustomRangeChange={handleCustomReadingRangeChange}
        onRangeChange={handleReadingRangeChange}
      />
    ) : (
      <PitchTrainingControls settings={settings} onSettingsChange={updateSettings} />
    );

  function getFeedbackText() {
    if (!feedback) return isRunning ? "Listening" : "Ready";
    if (feedback.isCorrect) return "Correct";
    if (mode === "pitch" && !settings.revealPitchAfterAnswer) return "Try the next one";
    if (mode === "pitch" && settings.pitchExercise === "melody") {
      return `It was ${currentMelody.map((note) => note.id).join(" - ")}`;
    }
    return `It was ${activeNote.id}`;
  }

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
          subtitle={mode === "reading" ? readingRange.detail : pitchRange.detail}
          sessionStateLabel={sessionStateLabel}
          sessionStateTone={sessionStateTone}
          replayButtonLabel={replayButtonLabel}
          isNavOpen={isNavOpen}
          onOpenNav={() => setIsNavOpen(true)}
          onReplay={playCurrentNote}
        />

        <Suspense
          fallback={
            <section className="practice-panel" aria-label="Loading section">
              <p role="status">Loading section...</p>
            </section>
          }
        >
          {activeSection === "songs" ? (
            <SongsWorkspace songSession={songSession} />
          ) : activeSection === "practice" ? (
            <PracticeWorkspace
              currentPitchNote={currentPitchNote}
              currentMelody={currentMelody}
              currentReadingNote={currentReadingNote}
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
      </div>
    </main>
  );
}

export default App;
