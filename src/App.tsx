import { useCallback, useMemo, useState } from "react";
import MusicStaff from "./components/MusicStaff";
import PitchPrompt from "./components/PitchPrompt";
import PianoKeyboard from "./components/PianoKeyboard";
import PracticeStatsPanel from "./components/PracticeStatsPanel";
import ReadingRangeSelector from "./components/ReadingRangeSelector";
import StatTile from "./components/StatTile";
import { useDataPortability } from "./hooks/useDataPortability";
import { usePracticeProgress } from "./hooks/usePracticeProgress";
import { usePracticeSession } from "./hooks/usePracticeSession";
import { useSettings } from "./hooks/useSettings";
import { PITCH_ANSWER_OPTIONS, getReadingRange, normalizeCustomReadingRange } from "./noteData";
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

const shouldForceRenderError = () =>
  import.meta.env.MODE === "resilience" && window.sessionStorage.getItem("notesense.forceRenderError") === "true";

function App() {
  if (shouldForceRenderError()) {
    throw new Error("Forced NoteSense render failure");
  }

  const [dataStatus, setDataStatus] = useState<DataStatus>(null);

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
  const answerOptions = PITCH_ANSWER_OPTIONS;
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

  function getFeedbackText() {
    if (!feedback) return isRunning ? "Listening" : "Ready";
    if (feedback.isCorrect) return "Correct";
    if (mode === "pitch" && !settings.revealPitchAfterAnswer) return "Try the next one";
    return `It was ${activeNote.id}`;
  }

  return (
    <main className={`app-shell ${mode === "reading" ? "reading-layout" : "pitch-layout"}`}>
      <section className="practice-panel" aria-labelledby="app-title">
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

        <div className="mode-switch" aria-label="Practice mode">
          <button
            type="button"
            aria-pressed={mode === "reading"}
            className={mode === "reading" ? "active" : ""}
            onClick={() => setPracticeMode("reading")}
          >
            Note reading
          </button>
          <button
            type="button"
            aria-pressed={mode === "pitch"}
            className={mode === "pitch" ? "active" : ""}
            onClick={() => setPracticeMode("pitch")}
          >
            Pitch training
          </button>
        </div>

        {mode === "reading" && (
          <ReadingRangeSelector
            settings={settings}
            onCustomRangeChange={handleCustomReadingRangeChange}
            onRangeChange={handleReadingRangeChange}
          />
        )}

        <div className="round-strip" aria-label="Current round status">
          <StatTile label="Time" value={`${timeRemaining}s`} />
          <StatTile label="Round" value={`${roundCorrect}/${roundAttempts}`} />
          <StatTile label="Accuracy" value={roundAccuracy} />
          <StatTile label="Streak" value={currentStreak} />
        </div>

        <div className={`staff-card ${mode === "pitch" ? "pitch-card" : ""}`}>
          {mode === "reading" ? (
            <MusicStaff note={currentReadingNote} />
          ) : (
            <PitchPrompt note={currentPitchNote} reveal={shouldRevealPitch} />
          )}

          <div className="prompt-row">
            <div>
              <span className="prompt-label">
                {mode === "reading" ? "Find this note on the piano." : "Name the pitch you hear."}
              </span>
              <p>{promptDetail}</p>
            </div>
            <span className={`feedback ${feedbackClass}`} aria-live="polite" data-testid="practice-feedback">
              {getFeedbackText()}
            </span>
          </div>

          {mode === "reading" ? (
            <PianoKeyboard
              key={`${settings.readingRange}-${normalizedCustomRange.startNoteId}-${normalizedCustomRange.endNoteId}`}
              disabled={!isRunning || Boolean(feedback)}
              isCorrect={feedback?.isCorrect}
              revealedNoteId={feedback ? activeNote.id : undefined}
              selectedNoteId={feedback?.answerId}
              onKeySelect={handleReadingKeyAnswer}
            />
          ) : (
            <div className="answer-grid pitch-answer-grid">
              {answerOptions.map((answer, index) => (
                <button
                  className="answer-button"
                  key={answer}
                  type="button"
                  aria-label={`Answer ${answer}`}
                  disabled={!isRunning || Boolean(feedback)}
                  onClick={() => handleAnswer(answer)}
                >
                  <strong>{answer}</strong>
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
          )}

          <div className="action-row">
            <button className="primary-button" type="button" onClick={startRound}>
              {isRunning ? "Restart round" : "Start drill"}
            </button>
            {isRunning && (
              <button className="secondary-button" type="button" onClick={finishRound}>
                Finish round
              </button>
            )}
          </div>
        </div>
      </section>

      <PracticeStatsPanel
        activeProgress={activeProgress}
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
        settings={settings}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetProgress={handleResetProgress}
        onSettingsChange={updateSettings}
      />
    </main>
  );
}

export default App;
