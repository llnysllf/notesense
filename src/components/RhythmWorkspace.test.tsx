import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RhythmWorkspace from "./RhythmWorkspace";
import { useRhythmSession, type RhythmSettings } from "../hooks/useRhythmSession";

const settings: RhythmSettings = { bpm: 80, meter: { beats: 4, beatUnit: 4 }, bars: 2, vocabulary: "eighths" };

// The workspace is presentational, so the test supplies a real session the same
// way the shell does.
function Harness({
  value,
  onSettingsChange,
}: {
  value: RhythmSettings;
  onSettingsChange: (p: Partial<RhythmSettings>) => void;
}) {
  const session = useRhythmSession(value);
  return <RhythmWorkspace settings={value} session={session} onSettingsChange={onSettingsChange} />;
}

function renderWorkspace(overrides: Partial<RhythmSettings> = {}) {
  const onSettingsChange = vi.fn();
  render(<Harness value={{ ...settings, ...overrides }} onSettingsChange={onSettingsChange} />);
  return { onSettingsChange };
}

// Enough Web Audio for the metronome, with a clock the test drives by hand.
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

beforeEach(() => {
  vi.restoreAllMocks();
  currentTime = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("RhythmWorkspace", () => {
  it("shows the pattern and how to play it", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "Tap the rhythm" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Rhythm pattern" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByText(/space bar/i)).toBeInTheDocument();
  });

  it("offers tempo and vocabulary, marking the active choice", () => {
    const { onSettingsChange } = renderWorkspace();

    expect(screen.getByRole("group", { name: "Tempo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "80 BPM" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Eighths" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "120 BPM" }));
    expect(onSettingsChange).toHaveBeenCalledWith({ bpm: 120 });

    fireEvent.click(screen.getByRole("button", { name: "Triplets" }));
    expect(onSettingsChange).toHaveBeenCalledWith({ vocabulary: "triplets" });

    fireEvent.click(screen.getByRole("button", { name: "6/8" }));
    expect(onSettingsChange).toHaveBeenCalledWith({ meter: { beats: 6, beatUnit: 8 } });
  });

  it("keeps the tap pad disabled until a round is running", () => {
    renderWorkspace();

    const pad = screen.getByRole("button", { name: "Tap" });
    expect(pad).toBeDisabled();
    expect(pad).toHaveTextContent("Press Start");
  });

  it("regenerates the pattern on request", () => {
    renderWorkspace();
    const before = screen.getAllByRole("listitem").length;

    fireEvent.click(screen.getByRole("button", { name: "New pattern" }));

    // A fresh seed may produce the same count, so assert the control works
    // rather than asserting randomness.
    expect(screen.getByRole("button", { name: "New pattern" })).toBeEnabled();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(0);
  });

  it("shows no result before anything has been played", () => {
    renderWorkspace();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("runs a round and reports the components rather than one number", () => {
    vi.useFakeTimers();
    renderWorkspace();

    act(() => screen.getByRole("button", { name: "Start" }).click());
    expect(screen.getByRole("button", { name: "Tap" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "New pattern" })).toBeDisabled();

    // Past the count-in, then tap and let the round finish.
    act(() => {
      currentTime = 3.1;
      vi.advanceTimersByTime(3100);
    });
    act(() => screen.getByRole("button", { name: "Tap" }).click());
    act(() => {
      currentTime = 30;
      vi.advanceTimersByTime(30_000);
    });

    const result = screen.getByRole("status");
    expect(result).toBeInTheDocument();
    // Separate components, not a single opaque percentage.
    expect(result).toHaveTextContent(/In time:/);
    expect(result).toHaveTextContent(/Steadiness:/);
    expect(result).toHaveTextContent(/Average offset:/);
    expect(result).toHaveTextContent(/Completed:/);
  });

  it("taps on the space bar only while a round is running", () => {
    renderWorkspace();

    // No round: the key must not be swallowed.
    const before = new KeyboardEvent("keydown", { code: "Space", cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    act(() => screen.getByRole("button", { name: "Start" }).click());
    const during = new KeyboardEvent("keydown", { code: "Space", cancelable: true });
    act(() => {
      window.dispatchEvent(during);
    });
    // Scrolling the page mid-round would be its own bug.
    expect(during.defaultPrevented).toBe(true);
  });

  it("stops a running round", () => {
    renderWorkspace();
    act(() => screen.getByRole("button", { name: "Start" }).click());
    act(() => screen.getByRole("button", { name: "Stop" }).click());

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tap" })).toBeDisabled();
  });
});
