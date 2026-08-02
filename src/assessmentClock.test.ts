import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startAssessmentClock } from "./assessmentClock";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// A stand-in for the Web Audio clock: enough of a context for the metronome to
// schedule against, with time under the test's control.
function stubAudioContext() {
  const oscillator = {
    type: "",
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const context = {
    currentTime: 0,
    destination: {},
    createOscillator: () => oscillator,
    createGain: () => gain,
    resume: vi.fn(),
    close: vi.fn(),
  };
  vi.stubGlobal("AudioContext", function AudioContextStub() {
    return context;
  });
  return context;
}

describe("assessment clock", () => {
  it("counts in on the audio clock when audio is available", () => {
    const context = stubAudioContext();
    const onStart = vi.fn();

    const clock = startAssessmentClock({ bpm: 120, beatsPerBar: 4, onStart });

    expect(clock.isAudible).toBe(true);
    expect(clock.secondsUntilStart).toBeGreaterThan(0);

    // Run the scheduler far enough forward to reach the first beat of the
    // passage itself.
    context.currentTime = 5;
    vi.advanceTimersByTime(200);

    expect(onStart).toHaveBeenCalled();
    clock.stop();
    expect(context.close).toHaveBeenCalled();
  });

  it("still runs when audio is unavailable, silently rather than not at all", () => {
    vi.stubGlobal(
      "AudioContext",
      vi.fn(() => {
        throw new Error("blocked");
      }),
    );
    const onStart = vi.fn();

    const clock = startAssessmentClock({ bpm: 120, beatsPerBar: 4, onStart });

    // A learner with audio blocked can still be asked to read.
    expect(clock.isAudible).toBe(false);
    expect(clock.secondsUntilStart).toBeCloseTo(2, 5);
    expect(onStart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("places its zero at the first beat of the passage, not at the count-in", () => {
    vi.stubGlobal("AudioContext", undefined);
    const clock = startAssessmentClock({ bpm: 60, beatsPerBar: 4, countInBars: 1, onStart: vi.fn() });

    // Before the passage starts the clock reads negative, so a note played
    // during the count-in is recognisably not part of the performance.
    expect(clock.now()).toBeLessThan(0);
    clock.stop();
  });

  it("stops the count-in when the run is abandoned", () => {
    vi.stubGlobal("AudioContext", undefined);
    const onStart = vi.fn();

    const clock = startAssessmentClock({ bpm: 60, beatsPerBar: 4, onStart });
    clock.stop();
    vi.advanceTimersByTime(10_000);

    expect(onStart).not.toHaveBeenCalled();
  });
});
