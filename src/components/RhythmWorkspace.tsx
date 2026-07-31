import { useEffect } from "react";
import {
  describeRhythm,
  RHYTHM_VOCABULARIES,
  type RhythmSessionView,
  type RhythmSettings,
  type RhythmVocabulary,
} from "../types";

// Tap the rhythm you see, against a metronome.
//
// The result is shown as separate components rather than one number, because
// "72%" hides the thing the learner needs: whether they were steady but offset
// (a latency or anticipation problem) or simply uneven (a pulse problem).

const VOCABULARY_LABELS: Record<RhythmVocabulary, string> = {
  simple: "Whole, half, quarter",
  eighths: "Eighths",
  sixteenths: "Sixteenths",
  dotted: "Dotted",
  triplets: "Triplets",
};

const TEMPOS = [60, 80, 100, 120] as const;
const METERS = [
  { label: "4/4", value: { beats: 4, beatUnit: 4 } },
  { label: "6/8", value: { beats: 6, beatUnit: 8 } },
] as const;

type RhythmWorkspaceProps = {
  settings: RhythmSettings;
  session: RhythmSessionView;
  onSettingsChange: (patch: Partial<RhythmSettings>) => void;
};

function RhythmWorkspace({ settings, session, onSettingsChange }: RhythmWorkspaceProps) {
  const { isRunning, tap } = session;

  // The space bar is the natural tap key, and it must not scroll the page.
  useEffect(() => {
    if (!isRunning) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      tap();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, tap]);

  const summary = session.score ? describeRhythm(session.score, session.toleranceMs) : undefined;

  return (
    <section className="practice-panel rhythm-panel" aria-labelledby="rhythm-heading">
      <p className="eyebrow">Rhythm</p>
      <h2 id="rhythm-heading">Tap the rhythm</h2>

      <div className="mode-switch" role="group" aria-label="Rhythm vocabulary">
        {RHYTHM_VOCABULARIES.map((vocabulary) => (
          <button
            key={vocabulary}
            type="button"
            aria-pressed={vocabulary === settings.vocabulary}
            className={vocabulary === settings.vocabulary ? "active" : ""}
            onClick={() => onSettingsChange({ vocabulary })}
          >
            {VOCABULARY_LABELS[vocabulary]}
          </button>
        ))}
      </div>

      <div className="mode-switch" role="group" aria-label="Tempo">
        {TEMPOS.map((bpm) => (
          <button
            key={bpm}
            type="button"
            aria-pressed={bpm === settings.bpm}
            className={bpm === settings.bpm ? "active" : ""}
            onClick={() => onSettingsChange({ bpm })}
          >
            {bpm} BPM
          </button>
        ))}
      </div>

      <div className="mode-switch" role="group" aria-label="Meter">
        {METERS.map(({ label, value }) => (
          <button
            key={label}
            type="button"
            aria-pressed={value.beats === settings.meter.beats && value.beatUnit === settings.meter.beatUnit}
            className={
              value.beats === settings.meter.beats && value.beatUnit === settings.meter.beatUnit ? "active" : ""
            }
            onClick={() => onSettingsChange({ meter: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <ol className="rhythm-strip" aria-label="Rhythm pattern">
        {session.isRunning ? (
          <li
            className="rhythm-cursor"
            aria-label="Playback position"
            style={{ left: `${session.cursorProgress * 100}%` }}
          />
        ) : null}
        {session.pattern.events.map((event, index) => (
          <li
            key={`${index}-${event.offset.num}/${event.offset.den}`}
            className={`rhythm-cell ${event.isRest ? "rest" : ""}`}
            // Width in proportion to duration, so the notation reads as rhythm.
            style={{ flexGrow: event.duration.num / event.duration.den }}
          >
            <span aria-hidden="true">{event.isRest ? "·" : "♪"}</span>
          </li>
        ))}
      </ol>

      <div className="action-row">
        <button type="button" className="primary-button" onClick={session.isRunning ? session.stop : session.start}>
          {session.isRunning ? "Stop" : "Start"}
        </button>
        <button type="button" className="secondary-button" onClick={session.newPattern} disabled={session.isRunning}>
          New pattern
        </button>
      </div>

      <button
        type="button"
        className="tap-pad"
        aria-label="Tap"
        disabled={!session.isRunning}
        onPointerDown={session.tap}
      >
        {session.isCountingIn ? "Count in…" : session.isRunning ? "Tap" : "Press Start"}
      </button>

      <p className="rhythm-hint">Tap the pad or press the space bar on each note.</p>

      {session.score ? (
        <div className="rhythm-result" role="status">
          <p className="rhythm-summary">{summary}</p>
          <ul className="rhythm-components">
            <li>
              In time: {session.score.onTime}/{session.score.expectedCount}
            </li>
            <li>Steadiness: {Math.round(session.score.pulseSteadiness * 100)}%</li>
            <li>Average offset: {Math.round(session.score.meanErrorMs)}ms</li>
            <li>Completed: {Math.round(session.score.completion * 100)}%</li>
            {session.score.extraTaps > 0 ? <li>Extra taps: {session.score.extraTaps}</li> : null}
          </ul>
          <ol className="rhythm-verdicts" aria-label="Timing feedback for each onset">
            {session.score.onsets.map((onset, index) => (
              <li key={`${index}-${onset.expectedSeconds}`} className={onset.verdict}>
                Beat {index + 1}: {onset.verdict}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

export default RhythmWorkspace;
