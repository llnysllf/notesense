import EarChoiceAnswer from "./ear/EarChoiceAnswer";
import EarFeedback from "./ear/EarFeedback";
import EarNoteAnswer from "./ear/EarNoteAnswer";
import EarPrompt from "./ear/EarPrompt";
import EarTranscriber from "./ear/EarTranscriber";
import { earChoiceOptions, type EarDrillView } from "../types";

// The ear-training screen.
//
// Which answer control appears is decided by the exercise's own expected answer
// rather than by a list of family names kept here. A new family that answers
// with a name or a played-back sequence gets its screen for free, and cannot
// arrive with no way to answer at all.

type EarWorkspaceProps = { drill: EarDrillView };

function EarWorkspace({ drill }: EarWorkspaceProps) {
  const { session, family } = drill;
  const expected = session.definition?.expectedAnswer;
  const isAnswered = session.result !== null;
  const options = earChoiceOptions(family);

  return (
    <section className="practice-panel ear-workspace" aria-label="Ear training">
      <EarPrompt
        definition={session.definition}
        families={drill.families}
        family={family}
        mode={drill.mode}
        canPlay={session.canPlay}
        replaysLeft={session.replaysLeft}
        hasPlayed={drill.entered.length > 0 || drill.taps.length > 0 || isAnswered}
        onFamilyChange={drill.setFamily}
        onModeChange={drill.setMode}
        onPlay={session.play}
      />

      {expected?.kind === "choice" ? (
        <EarChoiceAnswer options={options} result={session.result} onChoose={drill.submitChoice} />
      ) : expected?.kind === "transcription" ? (
        <EarTranscriber
          transcriber={drill.transcriber}
          slots={drill.slots}
          isAnswered={isAnswered}
          comparison={session.result?.comparison}
          onPlayAnswer={drill.playAnswer}
          onSubmit={drill.submit}
        />
      ) : expected?.kind === "rhythm" ? (
        <div className="ear-rhythm-echo">
          <p className="ear-entered" aria-live="polite">
            {drill.taps.length === 0 ? "Tap the rhythm back when you are ready." : `${drill.taps.length} taps`}
          </p>
          <div className="ear-actions">
            <button type="button" className="primary-button ear-tap-button" onClick={drill.tap} disabled={isAnswered}>
              Tap
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={drill.submit}
              disabled={isAnswered || drill.taps.length === 0}
            >
              Submit
            </button>
          </div>
        </div>
      ) : (
        <EarNoteAnswer
          entered={drill.entered}
          isAnswered={isAnswered}
          singleNote={expected?.kind === "pitch"}
          onPlayNote={drill.playNote}
          onUndo={drill.undoNote}
          onClear={drill.clearNotes}
          onPlayAnswer={drill.playAnswer}
          onSubmit={drill.submit}
        />
      )}

      {session.result ? <EarFeedback result={session.result} onNext={session.next} /> : null}
    </section>
  );
}

export default EarWorkspace;
