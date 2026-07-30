// The one line of text under a prompt that tells the learner where they stand.
//
// Pulled out of the shell because the rules are worth reading on their own:
// what gets revealed depends on the mode, and a test must never show the answer.

import { getReadingModeRules, type FeedbackState, type PitchNote, type PracticeSettings } from "./types";

export type FeedbackTextOptions = {
  feedback: FeedbackState;
  isRunning: boolean;
  mode: string;
  settings: PracticeSettings;
  activeNoteId: string;
  currentMelody: readonly PitchNote[];
};

export function getPracticeFeedbackText({
  feedback,
  isRunning,
  mode,
  settings,
  activeNoteId,
  currentMelody,
}: FeedbackTextOptions): string {
  if (!feedback) return isRunning ? "Listening" : "Ready";
  if (feedback.isCorrect) return "Correct";

  // A test that shows the answer is teaching, not measuring.
  if (mode === "reading" && !getReadingModeRules(settings.readingMode).revealAnswer) return "Try the next one";
  if (mode === "pitch" && !settings.revealPitchAfterAnswer) return "Try the next one";
  if (mode === "pitch" && settings.pitchExercise === "melody") {
    return `It was ${currentMelody.map((note) => note.id).join(" - ")}`;
  }

  return `It was ${activeNoteId}`;
}
