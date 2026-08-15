import MusicStaff from "../MusicStaff";
import type { ReadingDemoView } from "../../types";

type ReadingDemoProps = {
  demo: ReadingDemoView;
  onStart: () => void;
};

// A real prompt, drawn by the app's own staff component and drawn from the
// app's own note selection.
//
// A screenshot would load faster and would be a claim rather than a
// demonstration. This is the product, minus the parts a first-time visitor has
// not agreed to: nothing is saved, and no round is running.
function ReadingDemo({ demo, onStart }: ReadingDemoProps) {
  const { note, options, verdict, lastAnswer } = demo;

  return (
    <section className="demo" aria-labelledby="demo-heading">
      <h2 id="demo-heading">Try one now</h2>
      <p className="demo-intro">This is the real drill. Nothing here is saved.</p>

      <MusicStaff note={note} />

      <div className="demo-options" role="group" aria-label="Name the note">
        {options.map((name) => (
          <button
            key={name}
            type="button"
            className="demo-option"
            disabled={verdict !== "unanswered"}
            aria-pressed={lastAnswer === name}
            onClick={() => demo.answer(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="demo-verdict" role="status">
        {verdict === "unanswered" && "Which note is on the staff?"}
        {verdict === "correct" && `Yes — that is ${note.name}${note.octave}.`}
        {verdict === "wrong" && `Not quite. It was ${note.name}${note.octave}.`}
      </p>

      <div className="demo-actions">
        <button type="button" className="secondary-button" onClick={demo.next} disabled={verdict === "unanswered"}>
          Another note
        </button>
        <button type="button" className="primary-button" onClick={onStart}>
          Start practising
        </button>
      </div>

      {demo.answered > 0 && (
        <p className="demo-tally">
          {demo.correct} of {demo.answered} so far. The real thing keeps track for you.
        </p>
      )}
    </section>
  );
}

export default ReadingDemo;
