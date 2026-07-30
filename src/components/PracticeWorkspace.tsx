import type { ReactNode } from "react";
import type {
  DataStatus,
  FeedbackState,
  PitchExercise,
  PitchNote,
  PracticeMode,
  ReadingMiss,
  TrainingNote,
} from "../types";
import MistakeReplay from "./MistakeReplay";
import MusicStaff from "./MusicStaff";
import PianoKeyboard from "./PianoKeyboard";
import PitchPrompt from "./PitchPrompt";
import PitchSequenceAnswer from "./PitchSequenceAnswer";
import StatTile from "./StatTile";

type PracticeWorkspaceProps = {
  currentPitchNote: PitchNote;
  currentMelody: PitchNote[];
  currentReadingNote: TrainingNote;
  currentStreak: number;
  dataStatus: DataStatus;
  feedback: FeedbackState;
  feedbackClass: string;
  feedbackText: string;
  isRunning: boolean;
  keyboardResetKey: string;
  lookAheadReadingNote: TrainingNote | null;
  melodyAnswerNoteIds: string[];
  mode: PracticeMode;
  pitchExercise: PitchExercise;
  pitchRangeNoteIds: Set<string>;
  promptDetail: string;
  rangeControls: ReactNode;
  // What was missed this round, for post-round coaching. Nothing renders after
  // a clean round.
  readingMisses: readonly ReadingMiss[];
  roundAccuracy: string;
  roundAttempts: number;
  roundCorrect: number;
  shouldRevealPitch: boolean;
  timeRemaining: number;
  onClearMelodyAnswer: () => void;
  onFinishRound: () => void;
  onMelodyNoteInput: (noteId: string) => void;
  onPitchKeyAnswer: (noteId: string) => void;
  onReadingKeyAnswer: (noteId: string) => void;
  onStartReplay: (misses: readonly ReadingMiss[]) => void;
  onStartRound: () => void;
  onSubmitMelodyAnswer: () => void;
  onUndoMelodyAnswer: () => void;
};

function PracticeWorkspace({
  currentPitchNote,
  currentMelody,
  currentReadingNote,
  currentStreak,
  dataStatus,
  feedback,
  feedbackClass,
  feedbackText,
  isRunning,
  keyboardResetKey,
  lookAheadReadingNote,
  melodyAnswerNoteIds,
  mode,
  pitchExercise,
  pitchRangeNoteIds,
  promptDetail,
  rangeControls,
  readingMisses,
  roundAccuracy,
  roundAttempts,
  roundCorrect,
  shouldRevealPitch,
  timeRemaining,
  onClearMelodyAnswer,
  onFinishRound,
  onMelodyNoteInput,
  onPitchKeyAnswer,
  onReadingKeyAnswer,
  onStartReplay,
  onStartRound,
  onSubmitMelodyAnswer,
  onUndoMelodyAnswer,
}: PracticeWorkspaceProps) {
  const activeNote = mode === "reading" ? currentReadingNote : currentPitchNote;

  return (
    <section className="practice-panel" aria-label="Practice drill">
      {dataStatus && (
        <p className={`data-status ${dataStatus.tone}`} role="status">
          {dataStatus.message}
        </p>
      )}

      {rangeControls}
      {mode === "reading" && !isRunning ? <MistakeReplay misses={readingMisses} onReplay={onStartReplay} /> : null}

      <div className="round-strip" aria-label="Current round status">
        <StatTile label="Time" value={`${timeRemaining}s`} />
        <StatTile label="Round" value={`${roundCorrect}/${roundAttempts}`} />
        <StatTile label="Accuracy" value={roundAccuracy} />
        <StatTile label="Streak" value={currentStreak} />
      </div>

      <div className={`staff-card ${mode === "pitch" ? "pitch-card" : ""}`}>
        {mode === "reading" ? (
          <MusicStaff note={currentReadingNote} nextNote={lookAheadReadingNote} />
        ) : pitchExercise === "melody" ? (
          <PitchSequenceAnswer
            answerNoteIds={melodyAnswerNoteIds}
            feedback={feedback}
            notes={currentMelody}
            reveal={shouldRevealPitch}
            onClear={onClearMelodyAnswer}
            onSubmit={onSubmitMelodyAnswer}
            onUndo={onUndoMelodyAnswer}
          />
        ) : (
          <PitchPrompt note={currentPitchNote} reveal={shouldRevealPitch} />
        )}

        <div className="prompt-row">
          <div>
            <span className="prompt-label">
              {mode === "reading"
                ? "Find this note on the piano."
                : pitchExercise === "melody"
                  ? "Transcribe the pitch sequence."
                  : "Find the pitch you hear."}
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
        ) : pitchExercise === "melody" ? (
          <PianoKeyboard
            key={keyboardResetKey}
            disabled={!isRunning || Boolean(feedback) || melodyAnswerNoteIds.length >= currentMelody.length}
            rangeNoteIds={pitchRangeNoteIds}
            selectableKeyIds={pitchRangeNoteIds}
            selectedNoteId={melodyAnswerNoteIds.at(-1)}
            onKeySelect={onMelodyNoteInput}
          />
        ) : (
          <PianoKeyboard
            key={keyboardResetKey}
            disabled={!isRunning || Boolean(feedback)}
            isCorrect={feedback?.isCorrect}
            rangeNoteIds={pitchRangeNoteIds}
            revealedNoteId={feedback ? currentPitchNote.id : undefined}
            selectableKeyIds={pitchRangeNoteIds}
            selectedNoteId={feedback?.answerId}
            onKeySelect={onPitchKeyAnswer}
          />
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
