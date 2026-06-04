import { useEffect, useMemo, useState } from "react";
import {
  PITCH_ANSWER_OPTIONS,
  PITCH_NOTES,
  READING_ANSWER_OPTIONS,
  STARTER_NOTES,
  getNoteAccuracy,
  getRandomPitchNote,
  getRandomReadingNote,
} from "./noteData";
import { playTone } from "./audio";
import { completeRound, loadProgress, recordPitchAttempt, recordReadingAttempt, resetProgress, saveProgress } from "./storage";
import type { FeedbackState, NoteName, PitchNote, PracticeMode, PracticeProgress, ReadingNoteName, TrainingNote } from "./types";

const ROUND_SECONDS = 60;
const ADVANCE_DELAY_MS = 650;

function formatAccuracy(correct: number, attempts: number): string {
  if (attempts === 0) {
    return "0%";
  }

  return `${Math.round((correct / attempts) * 100)}%`;
}

function getModeLabel(mode: PracticeMode): string {
  return mode === "reading" ? "Note reading" : "Pitch training";
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
  const [currentReadingNote, setCurrentReadingNote] = useState<TrainingNote>(() => getRandomReadingNote());
  const [currentPitchNote, setCurrentPitchNote] = useState<PitchNote>(() => getRandomPitchNote());
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_SECONDS);
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const activeProgress = progress[mode];
  const answerOptions = mode === "reading" ? READING_ANSWER_OPTIONS : PITCH_ANSWER_OPTIONS;
  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;
  const roundAccuracy = formatAccuracy(roundCorrect, roundAttempts);
  const lifetimeAccuracy = formatAccuracy(activeProgress.totalCorrect, activeProgress.totalAttempts);
  const modeLabel = getModeLabel(mode);

  const focusItems = useMemo(() => {
    const sourceNotes = mode === "reading" ? STARTER_NOTES : PITCH_NOTES;

    return sourceNotes
      .map((note) => ({
        note,
        accuracy: getNoteAccuracy(progress[mode], note.id),
        attempts: progress[mode].noteStats[note.id]?.attempts ?? 0,
      }))
      .filter((entry) => entry.attempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
  }, [mode, progress]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (timeRemaining <= 0) {
      setIsRunning(false);
      setProgress((currentProgress) => {
        const nextProgress = completeRound(currentProgress, mode, roundCorrect);
        saveProgress(nextProgress);
        return nextProgress;
      });
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeRemaining((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isRunning, mode, roundCorrect, timeRemaining]);

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

  function setPracticeMode(nextMode: PracticeMode) {
    setMode(nextMode);
    setFeedback(null);
    setIsRunning(false);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setTimeRemaining(ROUND_SECONDS);
  }

  function startRound() {
    setIsRunning(true);
    setFeedback(null);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setTimeRemaining(ROUND_SECONDS);

    if (mode === "reading") {
      setCurrentReadingNote((note) => getRandomReadingNote(note.id));
      return;
    }

    const nextPitch = getRandomPitchNote(currentPitchNote.id);
    setCurrentPitchNote(nextPitch);
    playTone(nextPitch.frequency);
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

    setFeedback({ answer, isCorrect });
    setRoundAttempts((attempts) => attempts + 1);
    setRoundCorrect((correct) => correct + (isCorrect ? 1 : 0));

    setProgress((currentProgress) => {
      const nextProgress =
        answeredMode === "reading"
          ? recordReadingAttempt(currentProgress, answeredReadingNote, answer as ReadingNoteName)
          : recordPitchAttempt(currentProgress, answeredPitchNote, answer);
      saveProgress(nextProgress);
      return nextProgress;
    });

    window.setTimeout(() => {
      setFeedback(null);

      if (answeredMode === "reading") {
        setCurrentReadingNote((note) => getRandomReadingNote(note.id));
        return;
      }

      const nextPitch = getRandomPitchNote(answeredPitchNote.id);
      setCurrentPitchNote(nextPitch);
      playTone(nextPitch.frequency);
    }, ADVANCE_DELAY_MS);
  }

  function handleResetProgress() {
    const confirmed = window.confirm("Reset all saved NoteSense progress?");
    if (confirmed) {
      setProgress(resetProgress());
      setRoundAttempts(0);
      setRoundCorrect(0);
      setFeedback(null);
      setIsRunning(false);
      setTimeRemaining(ROUND_SECONDS);
    }
  }

  const feedbackClass = feedback ? (feedback.isCorrect ? "correct" : "wrong") : "";
  const feedbackText = feedback ? (feedback.isCorrect ? "Correct" : `It was ${activeNote.id}`) : isRunning ? "Listening" : "Ready";

  return (
    <main className="app-shell">
      <section className="practice-panel" aria-labelledby="app-title">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sight reading + ear training</p>
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
          <StatTile label="Best" value={activeProgress.bestRoundScore} />
        </div>

        <div className={`staff-card ${mode === "pitch" ? "pitch-card" : ""}`}>
          {mode === "reading" ? (
            <MusicStaff note={currentReadingNote} />
          ) : (
            <PitchPrompt note={currentPitchNote} reveal={Boolean(feedback)} />
          )}

          <div className="prompt-row">
            <div>
              <span className="prompt-label">{mode === "reading" ? "Which note is this?" : "Name the pitch you hear."}</span>
              <p>{mode === "reading" ? "Treble clef C4-G4" : "Natural notes C4-B4"}</p>
            </div>
            <span className={`feedback ${feedbackClass}`}>{feedbackText}</span>
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
              {isRunning ? "Restart round" : "Start 60s drill"}
            </button>
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
          <StatTile label="Rounds" value={activeProgress.sessionsCompleted} />
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
          <h3>V2 range</h3>
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
