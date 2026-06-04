import { useEffect, useMemo, useState } from "react";
import {
  PITCH_ANSWER_OPTIONS,
  PITCH_NOTES,
  READING_ANSWER_OPTIONS,
  STARTER_NOTES,
  getNoteAccuracy,
  selectPitchNote,
  selectReadingNote,
} from "./noteData";
import { playTone } from "./audio";
import {
  completeRound,
  loadProgress,
  loadSettings,
  recordPitchAttempt,
  recordReadingAttempt,
  resetProgress,
  saveProgress,
  saveSettings,
} from "./storage";
import type {
  FeedbackState,
  ModeProgress,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  ReadingNoteName,
  RoundLength,
  SessionSummary,
  TrainingNote,
} from "./types";

const ADVANCE_DELAY_MS = 650;
const ROUND_LENGTHS: RoundLength[] = [30, 60, 90];

function formatAccuracy(correct: number, attempts: number): string {
  if (attempts === 0) {
    return "0%";
  }

  return `${Math.round((correct / attempts) * 100)}%`;
}

function getModeLabel(mode: PracticeMode): string {
  return mode === "reading" ? "Note reading" : "Pitch training";
}

function getFocusItems(mode: PracticeMode, modeProgress: ModeProgress) {
  const sourceNotes = mode === "reading" ? STARTER_NOTES : PITCH_NOTES;

  return sourceNotes
    .map((note) => ({
      note,
      accuracy: getNoteAccuracy(modeProgress, note.id),
      attempts: modeProgress.noteStats[note.id]?.attempts ?? 0,
    }))
    .filter((entry) => entry.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
}

function createSessionSummary(
  mode: PracticeMode,
  progress: PracticeProgress,
  score: number,
  attempts: number,
  bestStreak: number,
): SessionSummary {
  const focusItem = getFocusItems(mode, progress[mode]).find((entry) => entry.accuracy < 85)?.note.id;
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  const suggestion =
    attempts === 0
      ? "Next: start with a short round and answer at least five prompts."
      : focusItem
        ? `Next: spend one short round on ${focusItem}.`
        : "Next: keep the same range and try to beat this score.";

  return {
    mode,
    score,
    attempts,
    accuracy,
    bestStreak,
    focusItem,
    suggestion,
  };
}

function MusicStaff({ note }: { note: TrainingNote }) {
  const staffLines = [56, 72, 88, 104, 120];
  const shouldShowLedgerLine = note.id === "C4";

  return (
    <svg className="staff" viewBox="0 0 420 184" role="img" aria-label={`Treble staff note ${note.id}`}>
      <text className="clef" x="54" y="119" aria-hidden="true">
        𝄞
      </text>
      {staffLines.map((lineY) => (
        <line key={lineY} x1="34" x2="386" y1={lineY} y2={lineY} className="staff-line" />
      ))}
      {shouldShowLedgerLine && <line x1="212" x2="276" y1={note.staffY} y2={note.staffY} className="staff-line" />}
      <ellipse cx="244" cy={note.staffY} rx="18" ry="12" className="note-head" transform={`rotate(-18 244 ${note.staffY})`} />
      <line x1="259" x2="259" y1={note.staffY - 5} y2={note.staffY - 68} className="note-stem" />
    </svg>
  );
}

function PitchPrompt({ note, reveal }: { note: PitchNote; reveal: boolean }) {
  return (
    <div className="pitch-prompt" aria-label={reveal ? `Pitch note ${note.id}` : "Hidden pitch note"}>
      <div className="sound-ring">
        <span aria-hidden="true">♪</span>
      </div>
      <strong>{reveal ? note.id : "?"}</strong>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);

  const activeProgress = progress[mode];
  const answerOptions = mode === "reading" ? READING_ANSWER_OPTIONS : PITCH_ANSWER_OPTIONS;
  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
  const roundAccuracy = formatAccuracy(roundCorrect, roundAttempts);
  const lifetimeAccuracy = formatAccuracy(activeProgress.totalCorrect, activeProgress.totalAttempts);
  const modeLabel = getModeLabel(mode);
  const focusItems = useMemo(() => getFocusItems(mode, progress[mode]), [mode, progress]);
  const promptDetail =
    mode === "reading"
      ? `${settings.adaptivePractice ? "Adaptive" : "Random"} | Treble clef C4-G4`
      : `${settings.adaptivePractice ? "Adaptive" : "Random"} | Natural notes C4-B4`;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (timeRemaining <= 0) {
      finishRound();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeRemaining((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isRunning, timeRemaining]);

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
      saveSettings(nextSettings);

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
    setTimeRemaining(settings.roundLength);
  }

  function startRound() {
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

  function finishRound() {
    if (!isRunning) {
      return;
    }

    const nextProgress = completeRound(progress, mode, roundCorrect);
    const summary = createSessionSummary(mode, nextProgress, roundCorrect, roundAttempts, bestRoundStreak);
    saveProgress(nextProgress);
    setProgress(nextProgress);
    setLastSummary(summary);
    setIsRunning(false);
    setFeedback(null);
    setTimeRemaining(settings.roundLength);
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
    saveProgress(nextProgress);

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
      setProgress(resetProgress());
      setRoundAttempts(0);
      setRoundCorrect(0);
      setCurrentStreak(0);
      setBestRoundStreak(0);
      setFeedback(null);
      setLastSummary(null);
      setIsRunning(false);
      setTimeRemaining(settings.roundLength);
    }
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
          <button type="button" className={mode === "reading" ? "active" : ""} onClick={() => setPracticeMode("reading")}>
            Note reading
          </button>
          <button type="button" className={mode === "pitch" ? "active" : ""} onClick={() => setPracticeMode("pitch")}>
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
              <span className="prompt-label">{mode === "reading" ? "Which note is this?" : "Name the pitch you hear."}</span>
              <p>{promptDetail}</p>
            </div>
            <span className={`feedback ${feedbackClass}`}>{getFeedbackText()}</span>
          </div>

          <div className={`answer-grid ${mode === "pitch" ? "pitch-answer-grid" : ""}`}>
            {answerOptions.map((answer, index) => (
              <button
                className="answer-button"
                key={answer}
                type="button"
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
            <button className="ghost-button" type="button" onClick={handleResetProgress}>
              Reset progress
            </button>
          </div>
        </div>
      </section>

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
          <div className="summary-card">
            <h3>Last round</h3>
            <div className="summary-grid">
              <StatTile label="Score" value={`${lastSummary.score}/${lastSummary.attempts}`} />
              <StatTile label="Accuracy" value={`${lastSummary.accuracy}%`} />
              <StatTile label="Best streak" value={lastSummary.bestStreak} />
            </div>
            <p>{lastSummary.suggestion}</p>
          </div>
        )}

        <div className="settings-card">
          <h3>Drill settings</h3>
          <div className="setting-row">
            <span>Round length</span>
            <div className="length-options" aria-label="Round length">
              {ROUND_LENGTHS.map((length) => (
                <button
                  key={length}
                  type="button"
                  className={settings.roundLength === length ? "active" : ""}
                  onClick={() => updateSettings({ roundLength: length })}
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
              onChange={(event) => updateSettings({ adaptivePractice: event.currentTarget.checked })}
            />
            <span>Adaptive practice</span>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.autoPlayPitch}
              onChange={(event) => updateSettings({ autoPlayPitch: event.currentTarget.checked })}
            />
            <span>Auto-play pitch</span>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.revealPitchAfterAnswer}
              onChange={(event) => updateSettings({ revealPitchAfterAnswer: event.currentTarget.checked })}
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
          <h3>V3 range</h3>
          <p>
            {mode === "reading"
              ? "Treble clef note reading from middle C to G."
              : "Pitch recognition across one natural-note octave from C4 to B4."}
          </p>
        </div>
      </aside>
    </main>
  );
}

export default App;
