// Turning MIDI into the runtime's own input events.
//
// The runtime never learns that MIDI exists: a note played on a piano and a note
// tapped on screen arrive as the same InputEvent and are graded by the same
// scorer. That is what makes "touch and MIDI produce comparable answers" true by
// construction rather than by remembering to keep two paths in step.

import type { InputEvent } from "../runtime/input";
import { createSustainTracker, isPianoMidi, parseMidiMessage, type SustainTracker } from "./message";

export type MidiAdapterOptions = {
  // Ignore traffic from other channels when a device sends several.
  channel?: number;
  // Corrects for measured device delay, so timing is judged on the performance
  // rather than the hardware.
  latencyMs?: number;
};

export type MidiAdapter = {
  /** Converts one raw MIDI message into zero or more runtime input events. */
  accept: (data: ArrayLike<number>, atSeconds: number) => InputEvent[];
  heldNotes: () => number[];
  reset: () => void;
};

export function createMidiAdapter(options: MidiAdapterOptions = {}): MidiAdapter {
  const { channel, latencyMs = 0 } = options;
  const sustain: SustainTracker = createSustainTracker();

  return {
    accept(data, atSeconds) {
      const message = parseMidiMessage(data);
      if (!message) return [];
      if (channel !== undefined && message.channel !== channel) return [];

      const at = atSeconds - latencyMs / 1000;
      const released = sustain.apply(message);
      const events: InputEvent[] = [];

      if (message.kind === "note-on" && isPianoMidi(message.midi)) {
        events.push({ kind: "note-on", midi: message.midi, velocity: message.velocity, atSeconds: at, source: "midi" });
      }
      if (message.kind === "sustain") {
        events.push({ kind: "sustain", down: message.down, atSeconds: at, source: "midi" });
      }
      for (const midi of released) {
        if (isPianoMidi(midi)) events.push({ kind: "note-off", midi, atSeconds: at, source: "midi" });
      }

      return events;
    },
    heldNotes: sustain.heldNotes,
    reset: sustain.reset,
  };
}
