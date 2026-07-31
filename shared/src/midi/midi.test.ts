import { describe, expect, it } from "vitest";
import { createSustainTracker, isPianoMidi, parseMidiMessage } from "./message";
import { createMidiAdapter } from "./adapter";
import {
  describeLatency,
  estimateLatency,
  MAX_PLAUSIBLE_LATENCY_MS,
  MIN_LATENCY_SAMPLES,
  type LatencySample,
} from "./latency";

// Status bytes: 0x9n note-on, 0x8n note-off, 0xBn control change, channel in n.
const noteOn = (midi: number, velocity = 100, channel = 0) => [0x90 | channel, midi, velocity];
const noteOff = (midi: number, channel = 0) => [0x80 | channel, midi, 0];
const pedal = (value: number, channel = 0) => [0xb0 | channel, 64, value];

describe("parseMidiMessage", () => {
  it("reads note-on and note-off with channel and velocity", () => {
    expect(parseMidiMessage(noteOn(60, 96))).toEqual({ kind: "note-on", channel: 0, midi: 60, velocity: 96 });
    expect(parseMidiMessage(noteOn(60, 96, 3))).toMatchObject({ channel: 3 });
    expect(parseMidiMessage(noteOff(60))).toEqual({ kind: "note-off", channel: 0, midi: 60 });
  });

  it("treats a note-on with zero velocity as a release", () => {
    // Most instruments release keys this way rather than sending note-off.
    expect(parseMidiMessage(noteOn(60, 0))).toEqual({ kind: "note-off", channel: 0, midi: 60 });
  });

  it("reads the sustain pedal as a threshold, not a boolean", () => {
    expect(parseMidiMessage(pedal(127))).toEqual({ kind: "sustain", channel: 0, down: true });
    expect(parseMidiMessage(pedal(64))).toMatchObject({ down: true });
    expect(parseMidiMessage(pedal(63))).toMatchObject({ down: false });
    expect(parseMidiMessage(pedal(0))).toMatchObject({ down: false });
  });

  it("passes other controllers through without interpreting them", () => {
    expect(parseMidiMessage([0xb0, 7, 100])).toMatchObject({ kind: "other", channel: 0 });
    expect(parseMidiMessage([0xe0, 0, 64])).toMatchObject({ kind: "other" });
  });

  it("ignores malformed traffic rather than guessing", () => {
    expect(parseMidiMessage([])).toBeUndefined();
    expect(parseMidiMessage([0x60, 60, 100])).toBeUndefined(); // not a status byte
    expect(parseMidiMessage([0x90, 60])).toBeUndefined(); // truncated
    expect(parseMidiMessage([0x90, 200, 100])).toBeUndefined(); // note out of range
    expect(parseMidiMessage([0x90, 60, 200])).toBeUndefined(); // velocity out of range
  });
});

describe("isPianoMidi", () => {
  it("accepts the 88 keys and nothing else", () => {
    expect(isPianoMidi(21)).toBe(true);
    expect(isPianoMidi(108)).toBe(true);
    expect(isPianoMidi(20)).toBe(false);
    expect(isPianoMidi(109)).toBe(false);
    expect(isPianoMidi(60.5)).toBe(false);
  });
});

describe("createSustainTracker", () => {
  it("releases a key that comes up with no pedal down", () => {
    const tracker = createSustainTracker();
    tracker.apply({ kind: "note-on", channel: 0, midi: 60, velocity: 100 });
    expect(tracker.heldNotes()).toEqual([60]);

    expect(tracker.apply({ kind: "note-off", channel: 0, midi: 60 })).toEqual([60]);
    expect(tracker.heldNotes()).toEqual([]);
  });

  it("keeps a pedalled note sounding until the pedal lifts", () => {
    const tracker = createSustainTracker();
    tracker.apply({ kind: "sustain", channel: 0, down: true });
    tracker.apply({ kind: "note-on", channel: 0, midi: 60, velocity: 100 });
    tracker.apply({ kind: "note-on", channel: 0, midi: 64, velocity: 100 });

    // Keys come up, but the pedal is holding them: nothing has stopped yet.
    expect(tracker.apply({ kind: "note-off", channel: 0, midi: 60 })).toEqual([]);
    expect(tracker.apply({ kind: "note-off", channel: 0, midi: 64 })).toEqual([]);

    // Lifting the pedal releases everything it held, at once.
    expect(tracker.apply({ kind: "sustain", channel: 0, down: false })).toEqual([60, 64]);
    expect(tracker.apply({ kind: "sustain", channel: 0, down: false })).toEqual([]);
  });

  it("does not release a key that is still held when the pedal lifts", () => {
    const tracker = createSustainTracker();
    tracker.apply({ kind: "sustain", channel: 0, down: true });
    tracker.apply({ kind: "note-on", channel: 0, midi: 60, velocity: 100 });

    expect(tracker.apply({ kind: "sustain", channel: 0, down: false })).toEqual([]);
    expect(tracker.heldNotes()).toEqual([60]);
  });

  it("ignores a release for a key that was never pressed", () => {
    const tracker = createSustainTracker();
    expect(tracker.apply({ kind: "note-off", channel: 0, midi: 60 })).toEqual([]);
    expect(tracker.apply({ kind: "other", channel: 0, status: 0xe0 })).toEqual([]);
  });

  it("forgets everything on reset, so a reconnect starts clean", () => {
    const tracker = createSustainTracker();
    tracker.apply({ kind: "note-on", channel: 0, midi: 60, velocity: 100 });
    tracker.reset();
    expect(tracker.heldNotes()).toEqual([]);
  });
});

describe("createMidiAdapter", () => {
  it("produces the same input events a touch answer would", () => {
    const adapter = createMidiAdapter();
    const events = adapter.accept(noteOn(60, 90), 1.5);

    expect(events).toEqual([{ kind: "note-on", midi: 60, velocity: 90, atSeconds: 1.5, source: "midi" }]);
  });

  it("corrects timestamps for measured device delay", () => {
    const adapter = createMidiAdapter({ latencyMs: 120 });
    const [event] = adapter.accept(noteOn(60), 2);

    // The note is credited to when it was played, not when it arrived.
    expect(event).toMatchObject({ atSeconds: 1.88 });
  });

  it("filters to one channel when asked", () => {
    const adapter = createMidiAdapter({ channel: 1 });

    expect(adapter.accept(noteOn(60, 100, 2), 0)).toEqual([]);
    expect(adapter.accept(noteOn(60, 100, 1), 0)).toHaveLength(1);
  });

  it("emits a release only when the note actually stops sounding", () => {
    const adapter = createMidiAdapter();
    adapter.accept(pedal(127), 0);
    adapter.accept(noteOn(60), 0.1);

    // Key up under the pedal: no release yet.
    expect(adapter.accept(noteOff(60), 0.2)).toEqual([]);

    const lifted = adapter.accept(pedal(0), 0.5);
    expect(lifted).toEqual([
      { kind: "sustain", down: false, atSeconds: 0.5, source: "midi" },
      { kind: "note-off", midi: 60, atSeconds: 0.5, source: "midi" },
    ]);
  });

  it("ignores notes outside the 88 keys and unparseable traffic", () => {
    const adapter = createMidiAdapter();
    expect(adapter.accept([0x90, 12, 100], 0)).toEqual([]);
    expect(adapter.accept([0x60], 0)).toEqual([]);
  });

  it("tracks held notes and clears them on reset", () => {
    const adapter = createMidiAdapter();
    adapter.accept(noteOn(60), 0);
    adapter.accept(noteOn(64), 0);
    expect(adapter.heldNotes()).toEqual([60, 64]);

    adapter.reset();
    expect(adapter.heldNotes()).toEqual([]);
  });
});

describe("estimateLatency", () => {
  const samples = (offsetsMs: number[]): LatencySample[] =>
    offsetsMs.map((offset, index) => ({ expectedSeconds: index, observedSeconds: index + offset / 1000 }));

  it("takes the median so one bad note does not move it", () => {
    const estimate = estimateLatency(samples([80, 82, 78, 81, 400]));

    expect(estimate.latencyMs).toBeCloseTo(81, 0);
    expect(estimate.isReliable).toBe(true);
    expect(estimate.sampleCount).toBe(5);
  });

  it("refuses to guess from too few samples", () => {
    const estimate = estimateLatency(samples([80, 80]));

    expect(estimate.isReliable).toBe(false);
    expect(describeLatency(estimate)).toMatch(new RegExp(`of ${MIN_LATENCY_SAMPLES}`));
  });

  it("rejects a take where the playing was not steady", () => {
    const estimate = estimateLatency(samples([0, 10, 200, 210]));

    expect(estimate.isReliable).toBe(false);
    expect(describeLatency(estimate)).toMatch(/varied too much/i);
  });

  it("does not treat playing ahead of the beat as latency", () => {
    const estimate = estimateLatency(samples([-40, -42, -38, -41]));

    expect(estimate.isReliable).toBe(false);
    expect(describeLatency(estimate)).toMatch(/ahead of the click/i);
  });

  it("rejects an implausibly large delay as a bad measurement", () => {
    const estimate = estimateLatency(samples([600, 602, 598, 601]));

    expect(estimate.latencyMs).toBeGreaterThan(MAX_PLAUSIBLE_LATENCY_MS);
    expect(estimate.isReliable).toBe(false);
    expect(describeLatency(estimate)).toMatch(/too large to be your device/i);
  });

  it("handles no samples at all without producing NaN", () => {
    expect(estimateLatency([])).toMatchObject({ latencyMs: 0, spreadMs: 0, sampleCount: 0, isReliable: false });
  });

  it("says what it will correct for once the estimate is trustworthy", () => {
    expect(describeLatency(estimateLatency(samples([90, 92, 88, 91, 90])))).toMatch(/about 90ms behind/i);
  });
});
