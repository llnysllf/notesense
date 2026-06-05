import { useCallback, useEffect, useMemo, useState } from "react";
import MusicStaff from "./components/MusicStaff";
import PitchPrompt from "./components/PitchPrompt";
import PracticeStatsPanel from "./components/PracticeStatsPanel";
import StatTile from "./components/StatTile";
import { PITCH_ANSWER_OPTIONS, PITCH_NOTES, READING_ANSWER_OPTIONS, STARTER_NOTES } from "./noteData";
import { playTone } from "./audio";
import {
  createSessionRecord,
  createSessionSummary,
  formatAccuracy,
  getFocusItems,
  getModeLabel,
  getSessionHistorySummary,
  selectPitchNote,
  selectReadingNote,
} from "./practiceEngine";
import {
  completeRound,
  createExportFileName,
  loadProgress,
  loadSettings,
  recordPitchAttempt,
  recordReadingAttempt,
  resetProgress,
  saveProgress,
  saveSettings,
  serializePracticeDataExport,
} from "./storage";
import type {
  FeedbackState,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  ReadingNoteName,
  SessionSummary,
  TrainingNote,
} from "./types";

const ADVANCE_DELAY_MS = 650;
const STORAGE_WARNING = "Progress is not being saved on this device right now.";

function App() {
  const [mode, setMode] = useState<PracticeMode>("reading");
  const [settings, setSettings] = useState<PracticeSettings>(() => loadSettings());
  const [currentReadingNote, setCurrentReadingNote] = useState<TrainingNote>(() => selectReadingNote());
  const [currentPitchNote, setCurrentPitchNote] = useState<PitchNote>(() => selectPitchNote());
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(settings.roundLength);
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestRoundStreak, setBestRoundStreak] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const activeProgress = progress[mode];
  const answerOptions = mode === "reading" ? READING_ANSWER_OPTIONS : PITCH_ANSWER_OPTIONS;
  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
  const roundAccuracy = formatAccuracy(roundCorrect, roundAttempts);
  const lifetimeAccuracy = formatAccuracy(activeProgress.totalCorrect, activeProgress.totalAttempts);
  const modeLabel = getModeLabel(mode);
  const focusItems = useMemo(() => getFocusItems(mode, progress[mode]), [mode, progress]);
  const historySummary = useMemo(() => getSessionHistorySummary(progress.history, mode), [mode, progress.history]);
  const promptDetail =
    mode === "reading"
      ? `${settings.adaptivePractice ? "Adaptive" : "Random"} | Treble clef C4-G4`
      : `${settings.adaptivePractice ? "Adaptive" : "Random"} | Natural notes C4-B4`;

  const persistProgress = useCallback((nextProgress: PracticeProgress) => {
    const saved = saveProgress(nextProgress);
    setStorageWarning(saved ? null : STORAGE_WARNING);
  }, []);

  const persistSettings = useCallback((nextSettings: PracticeSettings) => {
    const saved = saveSettings(nextSettings);
    setStorageWarning(saved ? null : STORAGE_WARNING);
  }, []);

  const finishRound = useCallback(() => {
    if (!isRunning) {
      return;
    }

    const completedAt = Date.now();
    const durationSeconds = roundStartedAt
      ? Math.max(1, Math.round((completedAt - roundStartedAt) / 1000))
      : Math.max(0, settings.roundLength - timeRemaining);
    const sessionRecord = createSessionRecord({
      id: `${mode}-${completedAt}`,
      mode,
      completedAt: new Date(completedAt).toISOString(),
      durationSeconds,
      score: roundCorrect,
      attempts: roundAttempts,
      bestStreak: bestRoundStreak,
    });
    const nextProgress = completeRound(progress, sessionRecord);
    const summary = createSessionSummary(mode, nextProgress, roundCorrect, roundAttempts, bestRoundStreak);
    persistProgress(nextProgress);
    setProgress(nextProgress);
    setLastSummary(summary);
    setIsRunning(false);
    setRoundStartedAt(null);
    setFeedback(null);
    setTimeRemaining(settings.roundLength);
  }, [
    bestRoundStreak,
    isRunning,
    mode,
    progress,
    roundAttempts,
    roundCorrect,
    roundStartedAt,
    persistProgress,
    settings.roundLength,
    timeRemaining,
  ]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (timeRemaining <= 0) {
      const finishTimer = window.setTimeout(finishRound, 0);
      return () => window.clearTimeout(finishTimer);
    }

    const timer = window.setTimeout(() => {
      setTimeRemaining((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [finishRound, isRunning, timeRemaining]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toUpperCase();
      const letterOption = answerOptions.find((answer) => answer === key);
      const shortcutSource = mode === "reading" ? STARTER_NOTES : PITCH_NOTES;
      const shortcutOption = shortcutSource.find((note) => note.keyboardShortcut === event.key);

      if (letterOption) {
        handleAnswer(letterOption);
        return;
      }

      if (shortcutOption) {
        handleAnswer(shortcutOption.name);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function updateSettings(patch: Partial<PracticeSettings>) {
    setSettings((currentSettings) => {
      const nextSettings = { ...currentSettings, ...patch };
      persistSettings(nextSettings);

      if (!isRunning && patch.roundLength) {
        setTimeRemaining(patch.roundLength);
      }

      return nextSettings;
    });
  }

  function getNextReadingNote(previousNoteId?: string, nextProgress = progress) {
    return selectReadingNote({
      previousNoteId,
      progress: nextProgress.reading,
      useAdaptive: settings.adaptivePractice,
    });
  }

  function getNextPitchNote(previousNoteId?: string, nextProgress = progress) {
    return selectPitchNote({
      previousNoteId,
      progress: nextProgress.pitch,
      useAdaptive: settings.adaptivePractice,
    });
  }

  function setPracticeMode(nextMode: PracticeMode) {
    setMode(nextMode);
    setFeedback(null);
    setLastSummary(null);
    setIsRunning(false);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setRoundStartedAt(null);
    setTimeRemaining(settings.roundLength);
  }

  function startRound() {
    setRoundStartedAt(Date.now());
    setIsRunning(true);
    setFeedback(null);
    setLastSummary(null);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setCurrentStreak(0);
    setBestRoundStreak(0);
    setTimeRemaining(settings.roundLength);

    if (mode === "reading") {
      setCurrentReadingNote((note) => getNextReadingNote(note.id));
      return;
    }

    const nextPitch = getNextPitchNote(currentPitchNote.id);
    setCurrentPitchNote(nextPitch);
    if (settings.autoPlayPitch) {
      playTone(nextPitch.frequency);
    }
  }

  function playCurrentNote() {
    playTone(activeNote.frequency);
  }

  function handleAnswer(answer: NoteName) {
    if (feedback || !isRunning) {
      return;
    }

    const answeredMode = mode;
    const answeredReadingNote = currentReadingNote;
    const answeredPitchNote = currentPitchNote;
    const expectedAnswer = answeredMode === "reading" ? answeredReadingNote.name : answeredPitchNote.name;
    const isCorrect = answer === expectedAnswer;
    const nextStreak = isCorrect ? currentStreak + 1 : 0;
    const nextBestStreak = Math.max(bestRoundStreak, nextStreak);
    const nextProgress =
      answeredMode === "reading"
        ? recordReadingAttempt(progress, answeredReadingNote, answer as ReadingNoteName)
        : recordPitchAttempt(progress, answeredPitchNote, answer);

    setFeedback({ answer, isCorrect });
    setRoundAttempts((attempts) => attempts + 1);
    setRoundCorrect((correct) => correct + (isCorrect ? 1 : 0));
    setCurrentStreak(nextStreak);
    setBestRoundStreak(nextBestStreak);
    setProgress(nextProgress);
    persistProgress(nextProgress);

    window.setTimeout(() => {
      setFeedback(null);

      if (answeredMode === "reading") {
        setCurrentReadingNote((note) => getNextReadingNote(note.id, nextProgress));
        return;
      }

      const nextPitch = getNextPitchNote(answeredPitchNote.id, nextProgress);
      setCurrentPitchNote(nextPitch);
      if (settings.autoPlayPitch) {
        playTone(nextPitch.frequency);
      }
    }, ADVANCE_DELAY_MS);
  }

  function handleResetProgress() {
    const confirmed = window.confirm("Reset all saved NoteSense progress?");
    if (confirmed) {
      const nextProgress = resetProgress();
      persistProgress(nextProgress);
      setProgress(nextProgress);
      setRoundAttempts(0);
      setRoundCorrect(0);
      setCurrentStreak(0);
      setBestRoundStreak(0);
      setFeedback(null);
      setLastSummary(null);
      setIsRunning(false);
      setRoundStartedAt(null);
      setTimeRemaining(settings.roundLength);
    }
  }

  function handleExportData() {
    const exportedAt = new Date();
    const exportData = serializePracticeDataExport(progress, settings, exportedAt.toISOString());
    const blob = new Blob([exportData], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = objectUrl;
    downloadLink.download = createExportFileName(exportedAt);
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function getFeedbackText() {
    if (!feedback) {
      return isRunning ? "Listening" : "Ready";
    }

    if (feedback.isCorrect) {
      return "Correct";
    }

    if (mode === "pitch" && !settings.revealPitchAfterAnswer) {
      return "Try the next one";
    }

    return `It was ${activeNote.id}`;
  }

  const feedbackClass = feedback ? (feedback.isCorrect ? "correct" : "wrong") : "";
  const shouldRevealPitch = Boolean(feedback) && settings.revealPitchAfterAnswer;

  return (
    <main className="app-shell">
      <section className="practice-panel" aria-labelledby="app-title">
        <header className="topbar">
          <div>
            <p className="eyebrow">Adaptive sight reading + ear training</p>
            <h1 id="app-title">NoteSense</h1>
          </div>
          <button className="secondary-button" type="button" onClick={playCurrentNote}>
            {mode === "reading" ? "Play note" : "Replay pitch"}
          </button>
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
                {mode === "reading" ? "Which note is this?" : "Name the pitch you hear."}
              </span>
              <p>{promptDetail}</p>
            </div>
            <span className={`feedback ${feedbackClass}`} aria-live="polite" data-testid="practice-feedback">
              {getFeedbackText()}
            </span>
          </div>

          <div className={`answer-grid ${mode === "pitch" ? "pitch-answer-grid" : ""}`}>
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
        focusItems={focusItems}
        historySummary={historySummary}
        lastSummary={lastSummary}
        lifetimeAccuracy={lifetimeAccuracy}
        mode={mode}
        modeLabel={modeLabel}
        settings={settings}
        storageWarning={storageWarning}
        onExportData={handleExportData}
        onResetProgress={handleResetProgress}
        onSettingsChange={updateSettings}
      />
    </main>
  );
}

export default App;
