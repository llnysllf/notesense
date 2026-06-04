import type { PitchNote } from "../types";

type PitchPromptProps = {
  note: PitchNote;
  reveal: boolean;
};

function PitchPrompt({ note, reveal }: PitchPromptProps) {
  return (
    <div className="pitch-prompt" aria-label={reveal ? `Pitch note ${note.id}` : "Hidden pitch note"}>
      <div className="sound-ring">
        <span aria-hidden="true">♪</span>
      </div>
      <strong>{reveal ? note.id : "?"}</strong>
    </div>
  );
}

export default PitchPrompt;
