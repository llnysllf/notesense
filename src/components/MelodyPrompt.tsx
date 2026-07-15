import type { PitchNote } from "../types";

type MelodyPromptProps = {
  notes: PitchNote[];
  reveal: boolean;
};

function MelodyPrompt({ notes, reveal }: MelodyPromptProps) {
  const noteIds = notes.map((note) => note.id);

  return (
    <div
      className="pitch-prompt melody-prompt"
      aria-label={reveal ? `Melody notes ${noteIds.join(", ")}` : `Hidden ${notes.length}-note melody`}
    >
      <div className="sound-ring">
        <span aria-hidden="true">♪</span>
      </div>
      <div className="melody-prompt-notes" aria-hidden="true">
        {reveal ? (
          noteIds.map((noteId, index) => <strong key={`${noteId}-${index}`}>{noteId}</strong>)
        ) : (
          <strong>{notes.length} notes</strong>
        )}
      </div>
    </div>
  );
}

export default MelodyPrompt;
