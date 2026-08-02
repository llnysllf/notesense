// The placement check.
//
// One note at a time, drawn at the difficulty the staircase currently estimates.
// It is short and skippable by design: its job is to pick a starting point, not
// to grade anyone, and a learner who would rather just start practising should
// be able to.

import { useCallback, useState } from "react";
import { getPianoKeyById } from "../noteData";
import { loadPlacement, savePlacement } from "../storage";
import {
  answerPlacement,
  buildAssessmentPassage,
  isPlacementComplete,
  midiToNoteId,
  placementOutcome,
  placementStartingPoint,
  startPlacement,
  type PlacementOutcome,
  type PlacementStartingPoint,
  type PlacementState,
} from "../types";

export type UsePlacementCheck = {
  state: PlacementState;
  // The note being asked about right now, as a note id the staff can render.
  promptNoteId: string;
  isComplete: boolean;
  outcome: PlacementOutcome | undefined;
  startingPoint: PlacementStartingPoint | undefined;
  // The saved result from a previous check, if there is one.
  saved: PlacementOutcome | undefined;
  storageWarning: boolean;
  answer: (noteId: string) => void;
  restart: () => void;
  accept: () => void;
};

// Placement items come from the same generator as the assessment, so the check
// and the test are made of the same material at the same difficulty rather than
// from two separate definitions of "medium".
function promptFor(state: PlacementState): string {
  const passage = buildAssessmentPassage({
    difficulty: state.difficulty,
    seed: `placement:${state.answered}:${state.difficulty.toFixed(2)}`,
  });
  return midiToNoteId(passage.notes[0]?.midi ?? 60);
}

export function usePlacementCheck(): UsePlacementCheck {
  const [state, setState] = useState<PlacementState>(startPlacement);
  const [saved, setSaved] = useState<PlacementOutcome | undefined>(() => loadPlacement());
  const [storageWarning, setStorageWarning] = useState(false);

  const promptNoteId = promptFor(state);
  const outcome = placementOutcome(state);

  const answer = useCallback((noteId: string) => {
    setState((current) => {
      if (isPlacementComplete(current)) return current;
      const expected = getPianoKeyById(promptFor(current))?.midi;
      const played = getPianoKeyById(noteId)?.midi;
      return answerPlacement(current, expected !== undefined && expected === played);
    });
  }, []);

  const restart = useCallback(() => setState(startPlacement()), []);

  // Accepting is a separate step from finishing: the result is a suggestion,
  // and a learner who disagrees with it should be able to walk away from it.
  const accept = useCallback(() => {
    if (!outcome) return;
    setSaved(outcome);
    if (!savePlacement(outcome)) setStorageWarning(true);
  }, [outcome]);

  return {
    state,
    promptNoteId,
    isComplete: isPlacementComplete(state),
    outcome,
    startingPoint: outcome ? placementStartingPoint(outcome) : undefined,
    saved,
    storageWarning,
    answer,
    restart,
    accept,
  };
}
