// Reading MIDI bytes.
//
// Kept pure and away from the browser so the wire format can be tested against
// fixtures rather than against a device. The awkward parts of MIDI are the parts
// worth encoding once: a note-on with velocity 0 is really a note-off, and the
// sustain pedal is a continuous controller whose value is a threshold, not a
// boolean.

export type MidiMessage =
  | { kind: "note-on"; channel: number; midi: number; velocity: number }
  | { kind: "note-off"; channel: number; midi: number }
  | { kind: "sustain"; channel: number; down: boolean }
  | { kind: "other"; channel: number; status: number };

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;
const SUSTAIN_CONTROLLER = 64;
// The MIDI spec treats 0-63 as off and 64-127 as on for switch controllers.
const SUSTAIN_ON_THRESHOLD = 64;

const LOWEST_PIANO_MIDI = 21;
const HIGHEST_PIANO_MIDI = 108;

export function isPianoMidi(midi: number): boolean {
  return Number.isInteger(midi) && midi >= LOWEST_PIANO_MIDI && midi <= HIGHEST_PIANO_MIDI;
}

// Parses one MIDI message. Returns undefined for anything malformed rather than
// guessing, since a device sending bytes we do not understand should be ignored,
// not misread.
export function parseMidiMessage(data: ArrayLike<number>): MidiMessage | undefined {
  if (data.length < 1) return undefined;

  const status = data[0] as number;
  if (status < 0x80) return undefined; // not a status byte

  const type = status & 0xf0;
  const channel = status & 0x0f;

  if (type === NOTE_ON || type === NOTE_OFF) {
    if (data.length < 3) return undefined;
    const midi = data[1] as number;
    const velocity = data[2] as number;
    if (midi < 0 || midi > 127 || velocity < 0 || velocity > 127) return undefined;

    // A note-on with zero velocity is how most instruments release a key.
    if (type === NOTE_OFF || velocity === 0) return { kind: "note-off", channel, midi };
    return { kind: "note-on", channel, midi, velocity };
  }

  if (type === CONTROL_CHANGE) {
    if (data.length < 3) return undefined;
    if (data[1] !== SUSTAIN_CONTROLLER) return { kind: "other", channel, status };
    return { kind: "sustain", channel, down: (data[2] as number) >= SUSTAIN_ON_THRESHOLD };
  }

  return { kind: "other", channel, status };
}

// Tracks which keys are down and whether the pedal is holding them, so a
// release is reported when the note actually stops sounding rather than when the
// key happens to come up. Without this, pedalled playing looks like a stream of
// notes that never end.
export type SustainTracker = {
  /** Returns the notes that stopped sounding as a result of this message. */
  apply: (message: MidiMessage) => number[];
  heldNotes: () => number[];
  reset: () => void;
};

export function createSustainTracker(): SustainTracker {
  const down = new Set<number>();
  const pedalled = new Set<number>();
  let pedalDown = false;

  return {
    apply(message) {
      if (message.kind === "note-on") {
        down.add(message.midi);
        pedalled.delete(message.midi);
        return [];
      }

      if (message.kind === "note-off") {
        if (!down.delete(message.midi)) return [];
        // The key came up but the pedal is holding it: not released yet.
        if (pedalDown) {
          pedalled.add(message.midi);
          return [];
        }
        return [message.midi];
      }

      if (message.kind === "sustain") {
        pedalDown = message.down;
        if (message.down) return [];
        // Lifting the pedal releases everything it was holding.
        const released = [...pedalled].sort((a, b) => a - b);
        pedalled.clear();
        return released;
      }

      return [];
    },
    heldNotes: () => [...down].sort((a, b) => a - b),
    reset() {
      down.clear();
      pedalled.clear();
      pedalDown = false;
    },
  };
}
