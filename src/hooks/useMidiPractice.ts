// Routing a played note into whatever drill is on screen.
//
// A note from a piano and a note tapped on screen reach the same answer
// handler, so nothing downstream — grading, evidence, the daily plan — needs to
// know which one the learner used. That is the whole point of the shared input
// contract; this hook is the only place the two meet.

import { useCallback } from "react";
import { useMidiInput, type UseMidiInput } from "./useMidiInput";
import type { MidiPanelProps } from "../midi/webMidi";
import { midiToNoteId, type InputEvent, type PracticeMode } from "../types";

// The hook also shapes what the settings panel needs, so the shell passes one
// value rather than restating the mapping.
export type UseMidiPractice = UseMidiInput & { panel: MidiPanelProps };

export type MidiPracticeOptions = {
  mode: PracticeMode;
  enabled?: boolean;
  latencyMs?: number;
  onLatencyChange?: (latencyMs: number) => void;
  onMidiNoteOn?: (noteId: string) => void;
  onReadingAnswer: (noteId: string) => void;
  onPitchAnswer: (noteId: string) => void;
};

export function useMidiPractice({
  mode,
  enabled = true,
  latencyMs,
  onLatencyChange,
  onMidiNoteOn,
  onReadingAnswer,
  onPitchAnswer,
}: MidiPracticeOptions): UseMidiPractice {
  const onInput = useCallback(
    (event: InputEvent) => {
      // Only a key going down is an answer. Releases and the pedal matter for
      // held-note tracking, not for saying which note the learner meant.
      if (event.kind !== "note-on") return;

      const noteId = midiToNoteId(event.midi);
      if (noteId.length === 0) return;

      onMidiNoteOn?.(noteId);
      if (!enabled) return;
      if (mode === "reading") onReadingAnswer(noteId);
      else onPitchAnswer(noteId);
    },
    [enabled, mode, onMidiNoteOn, onPitchAnswer, onReadingAnswer],
  );

  // MIDI shares the audio clock elsewhere; here only ordering matters, so the
  // performance clock is enough and needs no audio context.
  const now = useCallback(() => performance.now() / 1000, []);

  const midi = useMidiInput({
    now,
    onInput,
    ...(latencyMs === undefined ? {} : { latencyMs }),
    ...(onLatencyChange === undefined ? {} : { onLatencyChange }),
  });

  return {
    ...midi,
    panel: {
      support: midi.support,
      status: midi.status,
      devices: midi.devices,
      selectedId: midi.selectedId,
      latencyMs: midi.latencyMs,
      calibration: midi.calibration,
      onSetLatencyMs: midi.setLatencyMs,
      onConnect: midi.connect,
      onDisconnect: midi.disconnect,
      onSelectDevice: midi.selectDevice,
    },
  };
}
