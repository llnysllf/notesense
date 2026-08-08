// Routes a MIDI note to the exercise that is actually on screen. Keeping this
// at the app boundary means the MIDI adapter itself stays exercise-agnostic.
import { useMidiPractice, type UseMidiPractice } from "./useMidiPractice";
import type { MutableRefObject } from "react";
import type { AppSection } from "../routes";
import type { PracticeMode, PracticeSettings } from "../types";

type MidiAppInputOptions = {
  activeSection: AppSection;
  latencyMs: number;
  mode: PracticeMode;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
  onPitchAnswer: (noteId: string) => void;
  onReadingAnswer: (noteId: string) => void;
  onRhythmTap: () => void;
  assessmentPlayRef: MutableRefObject<(noteId: string) => void>;
  onSongAnswer: (noteIds: string[]) => void;
  onEarNote: (noteId: string) => void;
};

export function useMidiAppInput({
  activeSection,
  latencyMs,
  mode,
  onSettingsChange,
  onPitchAnswer,
  onReadingAnswer,
  onRhythmTap,
  assessmentPlayRef,
  onSongAnswer,
  onEarNote,
}: MidiAppInputOptions): UseMidiPractice {
  return useMidiPractice({
    mode,
    enabled: activeSection === "practice",
    latencyMs,
    onLatencyChange: (midiLatencyMs) => onSettingsChange({ midiLatencyMs }),
    onMidiNoteOn: (noteId) => {
      if (activeSection === "rhythm") onRhythmTap();
      if (activeSection === "songs") onSongAnswer([noteId]);
      if (activeSection === "ear") onEarNote(noteId);
      if (activeSection === "reading-score") assessmentPlayRef.current(noteId);
    },
    onReadingAnswer,
    onPitchAnswer,
  });
}
