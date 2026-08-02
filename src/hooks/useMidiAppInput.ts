// Routes a MIDI note to the exercise that is actually on screen. Keeping this
// at the app boundary means the MIDI adapter itself stays exercise-agnostic.
import { useMidiPractice, type UseMidiPractice } from "./useMidiPractice";
import type { AppSection } from "../routes";
import type { PracticeMode } from "../types";

type MidiAppInputOptions = {
  activeSection: AppSection;
  latencyMs: number;
  mode: PracticeMode;
  onLatencyChange: (latencyMs: number) => void;
  onPitchAnswer: (noteId: string) => void;
  onReadingAnswer: (noteId: string) => void;
  onRhythmTap: () => void;
  onAssessmentPlay: (noteId: string) => void;
  onSongAnswer: (noteIds: string[]) => void;
};

export function useMidiAppInput({
  activeSection,
  latencyMs,
  mode,
  onLatencyChange,
  onPitchAnswer,
  onReadingAnswer,
  onRhythmTap,
  onAssessmentPlay,
  onSongAnswer,
}: MidiAppInputOptions): UseMidiPractice {
  return useMidiPractice({
    mode,
    enabled: activeSection === "practice",
    latencyMs,
    onLatencyChange,
    onMidiNoteOn: (noteId) => {
      if (activeSection === "rhythm") onRhythmTap();
      if (activeSection === "songs") onSongAnswer([noteId]);
      if (activeSection === "reading-score") onAssessmentPlay(noteId);
    },
    onReadingAnswer,
    onPitchAnswer,
  });
}
