// Which settings changes invalidate the current round.
//
// Changing the range or the exercise shape mid-round would leave the learner
// answering prompts drawn under the old rules, so those changes restart the
// session. Cosmetic changes must not, or every toggle would throw away work.

import type { PracticeSettings } from "./types";

export function requiresSessionReset(settings: PracticeSettings, patch: Partial<PracticeSettings>): boolean {
  const readingRangeChanged = patch.readingRange !== undefined && patch.readingRange !== settings.readingRange;
  const customRangeChanged =
    patch.customReadingRange !== undefined &&
    (patch.customReadingRange.startNoteId !== settings.customReadingRange.startNoteId ||
      patch.customReadingRange.endNoteId !== settings.customReadingRange.endNoteId);
  const pitchRangeChanged = patch.pitchRange !== undefined && patch.pitchRange !== settings.pitchRange;
  const customPitchRangeChanged =
    patch.customPitchRange !== undefined &&
    (patch.customPitchRange.startNoteId !== settings.customPitchRange.startNoteId ||
      patch.customPitchRange.endNoteId !== settings.customPitchRange.endNoteId);
  const pitchExerciseChanged =
    (patch.pitchExercise !== undefined && patch.pitchExercise !== settings.pitchExercise) ||
    (patch.melodyLength !== undefined && patch.melodyLength !== settings.melodyLength);
  // Switching between Learn, Practice, Test, and Custom changes how prompts are
  // chosen, so the round has to start again under the new rules.
  const readingModeChanged = patch.readingMode !== undefined && patch.readingMode !== settings.readingMode;

  return (
    readingRangeChanged ||
    customRangeChanged ||
    pitchRangeChanged ||
    customPitchRangeChanged ||
    pitchExerciseChanged ||
    readingModeChanged
  );
}
