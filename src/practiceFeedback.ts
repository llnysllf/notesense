import type { FeedbackState, PitchNote, PracticeMode, PracticeSettings } from "./types";

type FeedbackTextInput = {
  feedback: FeedbackState;
  isRunning: boolean;
  mode: PracticeMode;
  settings: PracticeSettings;
  currentMelody: PitchNote[];
  activeNoteId: string;
};

// The prompt/feedback line shown under the current drill. Pure so the App
// shell stays lean and the branching is unit-testable on its own.
export function getPracticeFeedbackText({
  feedback,
  isRunning,
  mode,
  settings,
  currentMelody,
  activeNoteId,
}: FeedbackTextInput): string {
  if (!feedback) return isRunning ? "Listening" : "Ready";
  if (feedback.isCorrect) return "Correct";
  if (mode === "pitch" && !settings.revealPitchAfterAnswer) return "Try the next one";
  if (mode === "pitch" && settings.pitchExercise === "melody") {
    return `It was ${currentMelody.map((note) => note.id).join(" - ")}`;
  }
  return `It was ${activeNoteId}`;
}
