import type { EarFamily, EarFamilyId, ExerciseDefinition, ReadingMode } from "../../types";

// What is being asked, and the control that plays it.
//
// The replay count is stated rather than implied by a button quietly going
// grey: a limit the learner cannot see is a limit they will think is a bug.

type EarPromptProps = {
  definition: ExerciseDefinition | undefined;
  families: readonly EarFamily[];
  family: EarFamilyId;
  mode: ReadingMode;
  canPlay: boolean;
  replaysLeft: string | undefined;
  hasPlayed: boolean;
  onFamilyChange: (family: EarFamilyId) => void;
  onModeChange: (mode: ReadingMode) => void;
  onPlay: () => void;
};

const MODES: readonly { id: ReadingMode; label: string }[] = [
  { id: "learn", label: "Learn" },
  { id: "practice", label: "Practice" },
  { id: "test", label: "Test" },
];

function EarPrompt({
  definition,
  families,
  family,
  mode,
  canPlay,
  replaysLeft,
  hasPlayed,
  onFamilyChange,
  onModeChange,
  onPlay,
}: EarPromptProps) {
  const active = families.find((entry) => entry.id === family);

  return (
    <section className="ear-prompt" aria-labelledby="ear-heading">
      <h3 id="ear-heading">Ear training</h3>

      <label className="ear-picker">
        <span>Exercise</span>
        <select value={family} onChange={(event) => onFamilyChange(event.target.value as EarFamilyId)}>
          {families.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <div className="ear-modes" role="group" aria-label="Ear training mode">
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="chip-button"
            aria-pressed={entry.id === mode}
            aria-label={`${entry.label} mode`}
            onClick={() => onModeChange(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="ear-summary">{active?.summary}</p>
      <p className="ear-question">{definition?.title ?? "Loading the exercise…"}</p>

      <div className="ear-actions">
        <button type="button" className="primary-button" onClick={onPlay} disabled={!canPlay}>
          {hasPlayed ? "Play again" : "Play"}
        </button>
      </div>

      {replaysLeft ? (
        <p className="ear-replays" role="status">
          {replaysLeft}
        </p>
      ) : null}
    </section>
  );
}

export default EarPrompt;
