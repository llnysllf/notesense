// Remembers what was missed during the current reading round, so the summary
// can point at specific notes instead of a bare score.
//
// Misses are held for the round only: they are a coaching aid, not a record. The
// durable record of what was practised is the evidence ledger.
//
// State is adjusted during render rather than in an effect. That is React's
// recommended pattern for reacting to changed props, and it means a miss is
// never rendered a frame late (or a stale miss a frame early after a restart).

import { useState } from "react";
import { classifyReadingMistake, noteIdToMidi, type FeedbackState, type ReadingMiss } from "../types";

export type UseRoundMisses = {
  misses: ReadingMiss[];
  reset: () => void;
};

type Seen = { feedback: FeedbackState; isRunning: boolean };

function toMiss(mode: string, feedback: FeedbackState, expectedNoteId: string | undefined): ReadingMiss | undefined {
  if (!feedback || feedback.isCorrect || mode !== "reading") return undefined;

  const expectedMidi = expectedNoteId === undefined ? undefined : noteIdToMidi(expectedNoteId);
  const answeredMidi = feedback.answerId === undefined ? undefined : noteIdToMidi(feedback.answerId);
  if (expectedMidi === undefined || answeredMidi === undefined) return undefined;

  const code = classifyReadingMistake(expectedMidi, answeredMidi);
  return code ? { expectedMidi, answeredMidi, code } : undefined;
}

export function useRoundMisses(options: {
  mode: string;
  feedback: FeedbackState;
  expectedNoteId: string | undefined;
  isRunning: boolean;
}): UseRoundMisses {
  const { mode, feedback, expectedNoteId, isRunning } = options;
  const [misses, setMisses] = useState<ReadingMiss[]>([]);
  // Feedback is a fresh object per answer, so its identity marks a new answer.
  const [seen, setSeen] = useState<Seen>({ feedback, isRunning });

  if (feedback !== seen.feedback || isRunning !== seen.isRunning) {
    setSeen({ feedback, isRunning });

    if (isRunning && !seen.isRunning) {
      // A new round starts from a clean slate.
      setMisses([]);
    } else if (feedback !== seen.feedback) {
      const miss = toMiss(mode, feedback, expectedNoteId);
      if (miss) setMisses((current) => [...current, miss]);
    }
  }

  return { misses, reset: () => setMisses([]) };
}
