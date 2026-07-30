import { READING_MISTAKE_LABELS, groupMisses, midiToNoteId, type ReadingMiss } from "../types";

// What went wrong in the round just finished, grouped by the note that was on
// the staff. Grouping by the prompt rather than by the wrong answer is what
// makes it actionable: it names the notes worth looking at again.
//
// Nothing renders after a clean round. A panel that says "0 mistakes" is noise.

type MistakeReplayProps = {
  misses: readonly ReadingMiss[];
  onReplay: (misses: readonly ReadingMiss[]) => void;
};

function MistakeReplay({ misses, onReplay }: MistakeReplayProps) {
  const groups = groupMisses(misses);
  if (groups.length === 0) return null;

  return (
    <section className="mistake-replay" aria-labelledby="mistake-replay-heading">
      <h3 id="mistake-replay-heading">Replay</h3>
      <ul className="mistake-list">
        {groups.slice(0, 5).map((group) => (
          <li key={group.expectedMidi}>
            <span className="mistake-note">{midiToNoteId(group.expectedMidi)}</span>
            <span className="mistake-detail">
              {READING_MISTAKE_LABELS[group.dominantCode]}: {group.misses}x
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary-button" onClick={() => onReplay(misses)}>
        Replay
      </button>
    </section>
  );
}

export default MistakeReplay;
