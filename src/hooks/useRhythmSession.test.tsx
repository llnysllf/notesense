import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRhythmSession, type RhythmSettings } from "./useRhythmSession";

// A stand-in for Web Audio: enough surface for the metronome to schedule
// against, with a clock the test advances by hand so timing is exact rather
// than wall-clock dependent.
let currentTime = 0;

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  type = "";
  connect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  get currentTime() {
    return currentTime;
  }
  destination = {};
  createOscillator() {
    return new FakeNode();
  }
  createGain() {
    return new FakeNode();
  }
  resume() {
    return Promise.resolve();
  }
}

const settings: RhythmSettings = { bpm: 120, meter: { beats: 4, beatUnit: 4 }, bars: 1, vocabulary: "simple" };

function Probe({ override }: { override?: Partial<RhythmSettings> }) {
  const session = useRhythmSession({ ...settings, ...override });
  return (
    <div>
      <span data-testid="running">{String(session.isRunning)}</span>
      <span data-testid="counting">{String(session.isCountingIn)}</span>
      <span data-testid="onsets">{session.pattern.events.length}</span>
      <span data-testid="tolerance">{Math.round(session.toleranceMs)}</span>
      <span data-testid="score">{session.score ? session.score.expectedCount : "none"}</span>
      <button type="button" onClick={session.start}>
        start
      </button>
      <button type="button" onClick={session.tap}>
        tap
      </button>
      <button type="button" onClick={session.stop}>
        stop
      </button>
      <button type="button" onClick={session.newPattern}>
        new
      </button>
    </div>
  );
}

beforeEach(() => {
  currentTime = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const click = (name: string) => act(() => screen.getByRole("button", { name }).click());

describe("useRhythmSession", () => {
  it("starts idle with a pattern ready", () => {
    render(<Probe />);

    expect(screen.getByTestId("running")).toHaveTextContent("false");
    expect(Number(screen.getByTestId("onsets").textContent)).toBeGreaterThan(0);
    expect(screen.getByTestId("score")).toHaveTextContent("none");
    // A quarter of a 120bpm beat.
    expect(screen.getByTestId("tolerance")).toHaveTextContent("125");
  });

  it("counts in before the pattern begins", () => {
    render(<Probe />);
    click("start");

    expect(screen.getByTestId("running")).toHaveTextContent("true");
    expect(screen.getByTestId("counting")).toHaveTextContent("true");
  });

  it("ignores taps during the count-in and grades the round when it ends", () => {
    render(<Probe />);
    click("start");

    // Still inside the count-in: this tap is not part of the performance.
    click("tap");

    // Advance past the count-in bar (4 beats at 120bpm = 2s) and play.
    act(() => {
      currentTime = 2.2;
      vi.advanceTimersByTime(2200);
    });
    click("tap");

    act(() => {
      currentTime = 10;
      vi.advanceTimersByTime(10_000);
    });

    // A score exists and covers the pattern's onsets.
    expect(screen.getByTestId("score")).not.toHaveTextContent("none");
    expect(screen.getByTestId("running")).toHaveTextContent("false");
  });

  it("stops cleanly without grading", () => {
    render(<Probe />);
    click("start");
    click("stop");

    expect(screen.getByTestId("running")).toHaveTextContent("false");
    expect(screen.getByTestId("score")).toHaveTextContent("none");
  });

  it("ignores a tap when no round is running", () => {
    render(<Probe />);
    click("tap");

    expect(screen.getByTestId("score")).toHaveTextContent("none");
  });

  it("regenerates the pattern and clears any score", () => {
    render(<Probe />);
    click("start");
    click("new");

    expect(screen.getByTestId("running")).toHaveTextContent("false");
    expect(screen.getByTestId("score")).toHaveTextContent("none");
    expect(Number(screen.getByTestId("onsets").textContent)).toBeGreaterThan(0);
  });

  it("still runs when the device has no audio", () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("no audio");
        }
      },
    );
    render(<Probe />);
    click("start");

    // The round does not claim to be counting in when there is no metronome.
    expect(screen.getByTestId("counting")).toHaveTextContent("false");
  });
});
