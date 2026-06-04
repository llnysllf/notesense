import { useEffect, useMemo, useState } from "react";
import { ANSWER_OPTIONS, STARTER_NOTES, getNoteAccuracy, getRandomNote } from "./noteData";
import { playTone } from "./audio";
import { loadProgress, recordAttempt, resetProgress, saveProgress } from "./storage";
import type { FeedbackState, NoteName, PracticeProgress, TrainingNote } from "./types";

const ROUND_SECONDS = 60;
const ADVANCE_DELAY_MS = 650;

function formatAccuracy(correct: number, attempts: number): string {
  if (attempts === 0) {
    return "0%";
  }

  return `${Math.round((correct / attempts) * 100)}%`;
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

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  const [currentNote, setCurrentNote] = useState<TrainingNote>(() => getRandomNote());
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_SECONDS);
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const roundAccuracy = formatAccuracy(roundCorrect, roundAttempts);
  const lifetimeAccuracy = formatAccuracy(progress.totalCorrect, progress.totalAttempts);

  const weakestNotes = useMemo(() => {
    return STARTER_NOTES.map((note) => ({
      note,
      accuracy: getNoteAccuracy(progress, note.id),
      attempts: progress.noteStats[note.id]?.attempts ?? 0,
    }))
      .filter((entry) => entry.attempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
  }, [progress]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (timeRemaining <= 0) {
      setIsRunning(false);
      setProgress((currentProgress) => {
        const nextProgress = {
          ...currentProgress,
          bestRoundScore: Math.max(currentProgress.bestRoundScore, roundCorrect),
          sessionsCompleted: currentProgress.sessionsCompleted + 1,
        };
        saveProgress(nextProgress);
        return nextProgress;
      });
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeRemaining((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isRunning, roundCorrect, timeRemaining]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toUpperCase();
      const option = ANSWER_OPTIONS.find((answer) => answer === key);
      const shortcutOption = STARTER_NOTES.find((note) => note.keyboardShortcut === event.key);

      if (option) {
        handleAnswer(option);
      }

      if (shortcutOption) {
        handleAnswer(shortcutOption.name);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function startRound() {
    setIsRunning(true);
    setFeedback(null);
    setRoundAttempts(0);
    setRoundCorrect(0);
    setTimeRemaining(ROUND_SECONDS);
    setCurrentNote((note) => getRandomNote(note.id));
  }

  function handleAnswer(answer: NoteName) {
    if (feedback || !isRunning) {
      return;
    }

    const isCorrect = answer === currentNote.name;
    setFeedback({ answer, isCorrect });
    setRoundAttempts((attempts) => attempts + 1);
    setRoundCorrect((correct) => correct + (isCorrect ? 1 : 0));

    setProgress((currentProgress) => {
      const nextProgress = recordAttempt(currentProgress, currentNote, answer);
      saveProgress(nextProgress);
      return nextProgress;
    });

    window.setTimeout(() => {
      setFeedback(null);
      setCurrentNote((note) => getRandomNote(note.id));
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

  return (
    <main className="app-shell">
      <section className="practice-panel" aria-labelledby="app-title">
        <header className="topbar">
          <div>
            <p className="eyebrow">Piano sight-reading trainer</p>
            <h1 id="app-title">NoteSense</h1>
          </div>
          <button className="secondary-button" type="button" onClick={() => playTone(currentNote.frequency)}>
            Play note
          </button>
        </header>

        <div className="round-strip" aria-label="Current round status">
          <StatTile label="Time" value={`${timeRemaining}s`} />
          <StatTile label="Round" value={`${roundCorrect}/${roundAttempts}`} />
          <StatTile label="Accuracy" value={roundAccuracy} />
          <StatTile label="Best" value={progress.bestRoundScore} />
        </div>

        <div className="staff-card">
          <MusicStaff note={currentNote} />
          <div className="prompt-row">
            <div>
              <span className="prompt-label">Which note is this?</span>
              <p>{isRunning ? "Answer with the buttons or keyboard keys C-G / 1-5." : "Start a 60-second drill when you are ready."}</p>
            </div>
            <span className={`feedback ${feedback ? (feedback.isCorrect ? "correct" : "wrong") : ""}`}>
              {feedback ? (feedback.isCorrect ? "Correct" : `It was ${currentNote.name}`) : isRunning ? "Listening" : "Ready"}
            </span>
          </div>

          <div className="answer-grid">
            {ANSWER_OPTIONS.map((answer, index) => (
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
          <h2>Progress</h2>
        </div>

        <div className="lifetime-grid">
          <StatTile label="Attempts" value={progress.totalAttempts} />
          <StatTile label="Correct" value={progress.totalCorrect} />
          <StatTile label="Accuracy" value={lifetimeAccuracy} />
          <StatTile label="Rounds" value={progress.sessionsCompleted} />
        </div>

        <div className="weak-notes">
          <h3>Focus notes</h3>
          {weakestNotes.length === 0 ? (
            <p className="empty-state">Finish a few questions and NoteSense will show notes that need extra attention.</p>
          ) : (
            <ul>
              {weakestNotes.map(({ note, accuracy, attempts }) => (
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
          <h3>V1 range</h3>
          <p>Treble clef only: middle C, D, E, F, and G. This keeps the first drill focused enough to practise daily.</p>
        </div>
      </aside>
    </main>
  );
}

export default App;
