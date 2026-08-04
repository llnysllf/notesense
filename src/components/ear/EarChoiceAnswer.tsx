import type { EarChoiceOption, EarResult } from "../../types";

// Naming what you heard.
//
// Every option in the family is offered, always in the same order. Shuffling
// them or hiding the hard ones would make the score go up without the learner
// hearing any better.

type EarChoiceAnswerProps = {
  options: readonly EarChoiceOption[];
  result: EarResult | null;
  onChoose: (optionId: string) => void;
};

function EarChoiceAnswer({ options, result, onChoose }: EarChoiceAnswerProps) {
  return (
    <div className="ear-choices" role="group" aria-label="Answer options">
      {options.map((option) => {
        const isAnswer = result?.expectedOptionId === option.id;
        // After an answer, the correct option is marked in text as well as in
        // colour, so the feedback survives without colour vision.
        const suffix = result && isAnswer ? " — correct answer" : "";

        return (
          <button
            key={option.id}
            type="button"
            className={`chip-button${result && isAnswer ? " ear-choice-correct" : ""}`}
            disabled={result !== null}
            aria-label={`${option.label}${suffix}`}
            onClick={() => onChoose(option.id)}
          >
            {option.label}
            {result && isAnswer ? <span aria-hidden="true"> ✓</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default EarChoiceAnswer;
