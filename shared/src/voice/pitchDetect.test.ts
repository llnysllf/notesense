import { describe, expect, it } from "vitest";
import { centsBetween, detectPitch, hertzToMidi, midiToHertz } from "./pitchDetect";

const SAMPLE_RATE = 44100;
const FRAME = 2048;

// A pure tone. The simplest thing a detector must get right.
function sine(hertz: number, amplitude = 0.5, length = FRAME): Float32Array {
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * hertz * index) / SAMPLE_RATE);
  }
  return samples;
}

// A voice is not a sine: it has a strong harmonic series, and a weak
// fundamental is exactly what makes naive detectors report the octave above.
function voiceLike(hertz: number, length = FRAME): Float32Array {
  const samples = new Float32Array(length);
  const partials = [
    { multiple: 1, gain: 0.4 },
    { multiple: 2, gain: 0.5 },
    { multiple: 3, gain: 0.35 },
    { multiple: 4, gain: 0.2 },
    { multiple: 5, gain: 0.1 },
  ];
  for (let index = 0; index < length; index += 1) {
    let value = 0;
    for (const { multiple, gain } of partials) {
      value += gain * Math.sin((2 * Math.PI * hertz * multiple * index) / SAMPLE_RATE);
    }
    samples[index] = value / 2;
  }
  return samples;
}

function noise(amplitude = 0.3, length = FRAME): Float32Array {
  const samples = new Float32Array(length);
  let seed = 12345;
  for (let index = 0; index < length; index += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    samples[index] = ((seed / 0x7fffffff) * 2 - 1) * amplitude;
  }
  return samples;
}

describe("pitch detection", () => {
  it("finds a pure tone across the singing range", () => {
    for (const hertz of [98, 131, 196, 220, 262, 330, 440, 523, 659, 880]) {
      const estimate = detectPitch(sine(hertz), { sampleRate: SAMPLE_RATE });

      expect(estimate.voiced).toBe(true);
      // Within five cents: finer than anyone can sing, so any error the learner
      // sees is theirs rather than the detector's.
      expect(Math.abs(centsBetween(estimate.hertz, hertz))).toBeLessThan(5);
    }
  });

  it("finds the fundamental of a voice-like tone, not its second harmonic", () => {
    for (const hertz of [110, 165, 220, 294, 392]) {
      const estimate = detectPitch(voiceLike(hertz), { sampleRate: SAMPLE_RATE });

      expect(estimate.voiced).toBe(true);
      // The classic failure: reporting an octave high because the second
      // harmonic is louder than the fundamental.
      expect(Math.abs(centsBetween(estimate.hertz, hertz))).toBeLessThan(15);
    }
  });

  it("reports silence as unvoiced rather than guessing", () => {
    const estimate = detectPitch(new Float32Array(FRAME), { sampleRate: SAMPLE_RATE });

    expect(estimate.voiced).toBe(false);
    expect(estimate.hertz).toBe(0);
    expect(estimate.confidence).toBe(0);
  });

  it("treats a very quiet frame as silence", () => {
    const estimate = detectPitch(sine(440, 0.001), { sampleRate: SAMPLE_RATE });

    expect(estimate.voiced).toBe(false);
    expect(estimate.level).toBeGreaterThan(0);
  });

  it("does not report a pitch for noise", () => {
    const estimate = detectPitch(noise(), { sampleRate: SAMPLE_RATE });

    // Room noise is not a note, and calling it one would put a wrong number in
    // front of the learner.
    expect(estimate.voiced).toBe(false);
  });

  it("reports a level for the input meter without exposing samples", () => {
    const loud = detectPitch(sine(440, 0.8), { sampleRate: SAMPLE_RATE });
    const quiet = detectPitch(sine(440, 0.05), { sampleRate: SAMPLE_RATE });

    expect(loud.level).toBeGreaterThan(quiet.level);
    // The estimate carries derived numbers only — no buffer travels with it.
    expect(Object.keys(loud).sort()).toEqual(["confidence", "hertz", "level", "voiced"]);
  });

  it("refuses input it cannot work with rather than throwing", () => {
    expect(detectPitch(new Float32Array(2), { sampleRate: SAMPLE_RATE }).voiced).toBe(false);
    expect(detectPitch(sine(440), { sampleRate: 0 }).voiced).toBe(false);
  });

  it("ignores a pitch outside the range it was asked for", () => {
    const estimate = detectPitch(sine(440), { sampleRate: SAMPLE_RATE, minHertz: 500, maxHertz: 900 });

    expect(estimate.voiced).toBe(false);
  });

  it("is more confident about a clean tone than a noisy one", () => {
    const clean = detectPitch(sine(220), { sampleRate: SAMPLE_RATE });
    const noisy = detectPitch(noise(0.05), { sampleRate: SAMPLE_RATE });

    expect(clean.confidence).toBeGreaterThan(noisy.confidence);
  });
});

describe("pitch arithmetic", () => {
  it("round-trips MIDI and hertz", () => {
    for (const midi of [40, 48, 60, 69, 72, 84]) {
      expect(hertzToMidi(midiToHertz(midi))).toBeCloseTo(midi, 6);
    }
    expect(midiToHertz(69)).toBeCloseTo(440, 6);
  });

  it("measures cents with a sign, so flat and sharp are distinguishable", () => {
    expect(centsBetween(440, 440)).toBeCloseTo(0, 6);
    expect(centsBetween(440 * Math.pow(2, 1 / 24), 440)).toBeCloseTo(50, 3);
    expect(centsBetween(440 / Math.pow(2, 1 / 24), 440)).toBeCloseTo(-50, 3);
  });

  it("has no opinion about a pitch that does not exist", () => {
    expect(hertzToMidi(0)).toBe(0);
    expect(centsBetween(0, 440)).toBe(0);
    expect(centsBetween(440, 0)).toBe(0);
  });
});
