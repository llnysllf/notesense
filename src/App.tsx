import { lazy, useCallback, useEffect, useRef, useState } from "react";
import AppShell from "./components/AppShell";
import type { PracticePanelView } from "./components/PracticeStatsPanel";
import PitchTrainingControls from "./components/PitchTrainingControls";
import ReadingControls from "./components/ReadingControls";
import { useAppRoute } from "./hooks/useAppRoute";
import { useAssessment } from "./hooks/useAssessment";
import { useRhythmDrill } from "./hooks/useRhythmDrill";
import { useMidiAppInput } from "./hooks/useMidiAppInput";
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
import type { DataStatus, PracticeProgress, PracticeSettings } from "./types";

const STORAGE_WARNING = "Progress is not being saved on this device right now.";
const PracticeStatsPanel = lazy(() => import("./components/PracticeStatsPanel"));
const SongsWorkspace = lazy(() => import("./components/SongsWorkspace"));
const TodayWorkspace = lazy(() => import("./components/TodayWorkspace"));
const RhythmWorkspace = lazy(() => import("./components/RhythmWorkspace"));
const PracticeWorkspace = lazy(() => import("./components/PracticeWorkspace"));
const RouteNotFound = lazy(() => import("./components/RouteNotFound"));
const AssessWorkspace = lazy(() => import("./components/AssessWorkspace"));
type WorkspaceSection = "today" | "practice" | "rhythm" | "songs" | "placement" | "reading-score";

const STATS_SECTION_BY_APP_SECTION: Record<Exclude<AppSection, WorkspaceSection>, PracticePanelView> = {
  progress: "overview",
  map: "map",
  history: "history",
  settings: "settings",
  data: "data",
};

const WORKSPACE_SECTIONS = new Set<string>(["today", "practice", "rhythm", "songs", "placement", "reading-score"]);

function getStatsView(section: AppSection): PracticePanelView {
  if (WORKSPACE_SECTIONS.has(section)) return "overview";

  return STATS_SECTION_BY_APP_SECTION[section as Exclude<AppSection, WorkspaceSection>];
}

const shouldForceRenderError = () =>
  import.meta.env.MODE === "resilience" && window.sessionStorage.getItem("notesense.forceRenderError") === "true";

function App() {
  if (shouldForceRenderError()) {
    throw new Error("Forced NoteSense render failure");
  }

  const [dataStatus, setDataStatus] = useState<DataStatus>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { route, isUnknownPath, goToSection } = useAppRoute();
  const activeSection = route.section;

  const { settings, setSettings, persistSettings } = useSettings();
  const rhythmDrill = useRhythmDrill();
  const songSession = useSongSession();
  const assessmentPlayRef = useRef<(noteId: string) => void>(() => {});
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

  function handleResetProgress() {
    if (!window.confirm("Reset all saved NoteSense progress?")) return;
    const next = resetProgress();
    if (!persistProgress(next)) setDataStatus({ message: STORAGE_WARNING, tone: "warning" });
    setProgress(next);
    session.resetSession(settings, next);
  }

  const midi = useMidiAppInput({
    activeSection,
    mode,
    latencyMs: settings.midiLatencyMs,
    onLatencyChange: (midiLatencyMs) => updateSettings({ midiLatencyMs }),
    onRhythmTap: rhythmDrill.session.tap,
    onAssessmentPlay: (noteId) => assessmentPlayRef.current(noteId),
    onSongAnswer: songSession.answerCurrentEvent,
    onReadingAnswer: handleReadingKeyAnswer,
    onPitchAnswer: handlePitchKeyAnswer,
  });
  // An assessment played on a piano is not the same test as one tapped on
  // glass, so the input source is declared with the result rather than guessed
  // at later.
  const assessment = useAssessment({
    inputSource: midi.status === "connected" ? "midi" : "touch",
    latencyMs: settings.midiLatencyMs,
  });
  assessmentPlayRef.current = assessment.readingScore.play;
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
        onCustomRangeChange={(customReadingRange) => updateSettings({ customReadingRange, readingRange: "custom" })}
        onRangeChange={(readingRange) => updateSettings({ readingRange })}
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
    <AppShell
      activeRouteId={route.id}
      activeSection={activeSection}
      layoutClass={mode === "reading" ? "reading-layout" : "pitch-layout"}
      subtitle={
        activeSection === "practice" ? (mode === "reading" ? readingRange.detail : pitchRange.detail) : route.label
      }
      sessionStateLabel={sessionStateLabel}
      sessionStateTone={sessionStateTone}
      replayButtonLabel={replayButtonLabel}
      isNavOpen={isNavOpen}
      errorResetKey={isUnknownPath ? window.location.pathname : route.id}
      onOpenNav={() => setIsNavOpen(true)}
      onCloseNav={() => setIsNavOpen(false)}
      onNavigate={handleNavigated}
      onReplay={playCurrentNote}
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
      ) : activeSection === "placement" || activeSection === "reading-score" ? (
        <AssessWorkspace
          view={activeSection}
          assessment={assessment}
          onSkipPlacement={() => goToSection("practice", "reading")}
        />
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
          midi={midi.panel}
          rangeControls={rangeControls}
          rangeDetail={mode === "reading" ? readingRange.detail : pitchRange.detail}
          settings={settings}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onResetProgress={handleResetProgress}
          onSettingsChange={updateSettings}
        />
      )}
    </AppShell>
  );
}

export default App;
