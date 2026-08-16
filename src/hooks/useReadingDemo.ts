import { useCallback, useState } from "react";
import { selectReadingNote } from "../practiceEngine";
import { READING_ANSWER_OPTIONS } from "../noteData";
import type { ReadingDemoView, ReadingNoteName, TrainingNote } from "../types";

// The home page's live demo.
//
// It calls the same note selection the practice screen calls and draws the same
// staff, so a visitor who tries it has tried the product rather than a mock-up
// of it. Nothing is saved: a demo that quietly wrote to a learner's practice
// record would corrupt the evidence the whole app is built on, and a visitor
// has not agreed to anything yet.

// The prompt and its tally are one value, not three.
//
// They were three, and the counter read two answers for one click: the updater
// that recorded the answer also incremented the tally, and React is free to run
// an updater more than once. Anything that must happen exactly once per answer
// has to be a pure function of the previous state, which means the previous
// state has to contain all of it.
type DemoState = {
  note: TrainingNote;
  lastAnswer: ReadingNoteName | null;
  answered: number;
  correct: number;
};

export function useReadingDemo(enabled: boolean): ReadingDemoView | null {
  const [state, setState] = useState<DemoState>(() => ({
    note: selectReadingNote(),
    lastAnswer: null,
    answered: 0,
    correct: 0,
  }));

  const answer = useCallback((name: ReadingNoteName) => {
    setState((previous) => {
      // One answer per prompt. Letting a visitor keep guessing until they hit it
      // would make the demo flatter than the product.
      if (previous.lastAnswer !== null) return previous;

      return {
        ...previous,
        lastAnswer: name,
        answered: previous.answered + 1,
        correct: previous.correct + (name === previous.note.name ? 1 : 0),
      };
    });
  }, []);

  const next = useCallback(() => {
    // Chosen outside the updater: picking a note is random, and an updater that
    // is not a pure function of its input gives a different answer each time it
    // is replayed.
    const nextNote = selectReadingNote({ previousNoteId: state.note.id });
    setState((previous) => ({ ...previous, note: nextNote, lastAnswer: null }));
  }, [state.note.id]);

  if (!enabled) return null;

  return {
    note: state.note,
    options: READING_ANSWER_OPTIONS,
    verdict: state.lastAnswer === null ? "unanswered" : state.lastAnswer === state.note.name ? "correct" : "wrong",
    lastAnswer: state.lastAnswer,
    answered: state.answered,
    correct: state.correct,
    answer,
    next,
  };
}
