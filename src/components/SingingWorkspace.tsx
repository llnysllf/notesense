import SingingResult from "./voice/SingingResult";
import SingingTargets from "./voice/SingingTargets";
import { describeRange, midiToNoteId, type SingingDrillView, type SingingStageId } from "../types";

// The singing screen.
//
// Two things are on it that are not on any other practice screen, and both are
// there for the same reason: a microphone is a different kind of ask. The
// privacy note is shown before anything is recorded rather than buried in
// settings, and the input meter is always visible while listening so a learner
// can see the app is hearing them — and see when it stops.

type SingingWorkspaceProps = { drill: SingingDrillView };

const SUPPORT_MESSAGES: Record<string, string> = {
  unsupported:
    "This browser cannot use a microphone. Chrome, Edge, Safari, and Firefox all support it on a secure connection. Every other exercise in NoteSense works without it.",
  "insecure-context":
    "Singing needs a secure (https) connection, because that is what browsers require before granting a microphone.",
};

function SingingWorkspace({ drill }: SingingWorkspaceProps) {
  const isListening = drill.status === "listening" || drill.status === "requesting";

  if (drill.support !== "available") {
    return (
      <section className="practice-panel singing-workspace" aria-label="Singing">
        <h3>Singing</h3>
        <p className="singing-note" role="note">
          {SUPPORT_MESSAGES[drill.support]}
        </p>
      </section>
    );
  }

  return (
    <section className="practice-panel singing-workspace" aria-label="Singing">
      <div className="singing-prompt">
        <h3>Singing</h3>

        <label className="singing-picker">
          <span>Exercise</span>
          <select
            value={drill.stageId}
            disabled={isListening}
            onChange={(event) => drill.setStage(event.target.value as SingingStageId)}
          >
            {drill.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>

        <p className="singing-summary">{drill.stages.find((stage) => stage.id === drill.stageId)?.summary}</p>

        {/* Said before anything is recorded, not buried in settings. */}
        <p className="singing-privacy" role="note">
          Your microphone is used only while you are singing, and only in this tab. NoteSense works out the pitch as you
          sing and keeps a few numbers about how close you were. No audio is recorded, saved, or sent anywhere.
        </p>

        <p className="singing-range">{describeRange(drill.range)}</p>

        {drill.status === "denied" ? (
          <p className="singing-note" role="status">
            No microphone. NoteSense asked for access and did not get it — every other exercise still works.
          </p>
        ) : null}
      </div>

      <SingingTargets
        exercise={drill.exercise}
        score={drill.score}
        referenceLabel={midiToNoteId(drill.exercise.referenceMidi)}
      />

      <div className="singing-controls">
        <div
          className="singing-meter"
          role="meter"
          aria-label="Microphone input level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, drill.level * 6) * 100)}
        >
          <span className="singing-meter-fill" style={{ width: `${Math.min(1, drill.level * 6) * 100}%` }} />
        </div>

        <p className="singing-status" aria-live="polite">
          {drill.status === "requesting"
            ? "Asking for the microphone…"
            : drill.countdownSeconds !== null
              ? `Starting in ${drill.countdownSeconds}…`
              : drill.isCalibrating
                ? "Sing from your lowest comfortable note to your highest."
                : drill.status === "listening"
                  ? "Listening — sing the phrase."
                  : "Ready when you are."}
        </p>

        {drill.status === "listening" && drill.liveMidi !== null ? (
          <p className="singing-pitch" aria-live="polite">
            Hearing {midiToNoteId(Math.round(drill.liveMidi))}
          </p>
        ) : null}

        <div className="singing-actions">
          <button type="button" className="secondary-button" onClick={drill.playReference} disabled={isListening}>
            Hear the starting note
          </button>
          {!drill.exercise.reading ? (
            <button type="button" className="secondary-button" onClick={drill.playPrompt} disabled={isListening}>
              Hear the phrase
            </button>
          ) : null}
          {isListening ? (
            <button type="button" className="primary-button" onClick={drill.stop}>
              Stop
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={drill.start}>
              Sing it
            </button>
          )}
          <button type="button" className="secondary-button" onClick={drill.startCalibration} disabled={isListening}>
            {drill.range ? "Check my range again" : "Find my range"}
          </button>
        </div>
      </div>

      {drill.score && drill.feedback ? (
        <SingingResult score={drill.score} feedback={drill.feedback} onNext={drill.next} />
      ) : null}
    </section>
  );
}

export default SingingWorkspace;
