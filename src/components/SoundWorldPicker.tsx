import type { SoundWorldView } from "../types";

type SoundWorldPickerProps = {
  sound: SoundWorldView;
};

// Choosing what practice sounds like.
//
// Two controls per world rather than one: choosing and hearing are different
// intentions, and folding them together would mean you cannot compare two
// voices without changing your settings twice. Size and licence are shown for
// every world, not only downloadable ones, so "no download" is something the
// learner can read rather than something they have to assume.
function SoundWorldPicker({ sound }: SoundWorldPickerProps) {
  return (
    <div className="settings-card">
      <h3>Sound</h3>
      {sound.notice && (
        <p className="sound-world-notice" role="status">
          {sound.notice}
        </p>
      )}
      <ul className="sound-world-list" aria-label="Sound world">
        {sound.worlds.map((world) => {
          const isActive = world.id === sound.activeId;

          return (
            <li key={world.id} className={isActive ? "sound-world active" : "sound-world"}>
              <button
                type="button"
                className="sound-world-choose"
                aria-pressed={isActive}
                onClick={() => sound.select(world.id)}
              >
                <span className="sound-world-label">{world.label}</span>
                <span className="sound-world-description">{world.description}</span>
              </button>
              <button
                type="button"
                className="sound-world-preview"
                aria-label={`Preview ${world.label}`}
                onClick={() => sound.preview(world.id)}
              >
                Preview
              </button>
              <p className="sound-world-credit">
                {world.approxBytes === 0 ? "No download" : `${Math.round(world.approxBytes / 1024 / 1024)} MB`} ·{" "}
                {world.attribution} · {world.license}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SoundWorldPicker;
