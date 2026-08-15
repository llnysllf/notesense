import { describe, expect, it, vi } from "vitest";
import { startMetronome } from "./metronome";

function audioContext(): AudioContext {
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  const oscillator = { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  return {
    get currentTime() {
      return Date.now() / 1000;
    },
    destination: {},
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => oscillator),
  } as unknown as AudioContext;
}

describe("startMetronome", () => {
  it("notifies consumers when a click is due, not when it is queued ahead", () => {
    vi.useFakeTimers();
    const onBeat = vi.fn();
    vi.setSystemTime(0);
    const clock = startMetronome(audioContext(), { bpm: 120, beatsPerBar: 4, onBeat });

    // The first click is scheduled at 150ms. The scheduler may queue it
    // early, but consumer cues must not get a 100ms visual head start.
    expect(onBeat).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onBeat).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onBeat).toHaveBeenCalledWith({ index: -4, isDownbeat: true, isCountIn: true });

    clock.stop();
    vi.useRealTimers();
  });
});
