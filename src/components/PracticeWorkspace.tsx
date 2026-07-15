import type { ReactNode } from "react";
import { PITCH_ANSWER_OPTIONS } from "../noteData";
import type { DataStatus, FeedbackState, NoteName, PitchNote, PracticeMode, TrainingNote } from "../types";
import MusicStaff from "./MusicStaff";
import PianoKeyboard from "./PianoKeyboard";
import PitchPrompt from "./PitchPrompt";
import StatTile from "./StatTile";

type PracticeWorkspaceProps = {
  currentPitchNote: PitchNote;
  currentReadingNote: TrainingNote;
  currentStreak: number;
  dataStatus: DataStatus;
  feedback: FeedbackState;
  feedbackClass: string;
  feedbackText: string;
  isRunning: boolean;
  keyboardResetKey: string;
  mode: PracticeMode;
  promptDetail: string;
  rangeControls: ReactNode;
  roundAccuracy: string;
  roundAttempts: number;
  roundCorrect: number;
  shouldRevealPitch: boolean;
  timeRemaining: number;
  onAnswer: (answer: NoteName) => void;
  onFinishRound: () => void;
  onReadingKeyAnswer: (noteId: string) => void;
  onStartRound: () => void;
};

function PracticeWorkspace({
  currentPitchNote,
  currentReadingNote,
  currentStreak,
  dataStatus,
  feedback,
  feedbackClass,
  feedbackText,
  isRunning,
  keyboardResetKey,
  mode,
  promptDetail,
  rangeControls,
  roundAccuracy,
  roundAttempts,
  roundCorrect,
  shouldRevealPitch,
  timeRemaining,
  onAnswer,
  onFinishRound,
  onReadingKeyAnswer,
  onStartRound,
}: PracticeWorkspaceProps) {
  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;

  return (
    <section className="practice-panel" aria-label="Practice drill">
      {dataStatus && (
        <p className={`data-status ${dataStatus.tone}`} role="status">
          {dataStatus.message}
        </p>
      )}

      {mode === "reading" && rangeControls}

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
            {feedbackText}
          </span>
        </div>

        {mode === "reading" ? (
          <PianoKeyboard
            key={keyboardResetKey}
            disabled={!isRunning || Boolean(feedback)}
            isCorrect={feedback?.isCorrect}
            revealedNoteId={feedback ? activeNote.id : undefined}
            selectedNoteId={feedback?.answerId}
            onKeySelect={onReadingKeyAnswer}
          />
        ) : (
          <div className="answer-grid pitch-answer-grid">
            {PITCH_ANSWER_OPTIONS.map((answer, index) => (
              <button
                className="answer-button"
                key={answer}
                type="button"
                aria-label={`Answer ${answer}`}
                disabled={!isRunning || Boolean(feedback)}
                onClick={() => onAnswer(answer)}
              >
                <strong>{answer}</strong>
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
        )}

        <div className="action-row">
          <button className="primary-button" type="button" onClick={onStartRound}>
            {isRunning ? "Restart round" : "Start drill"}
          </button>
          {isRunning && (
            <button className="secondary-button" type="button" onClick={onFinishRound}>
              Finish round
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default PracticeWorkspace;
