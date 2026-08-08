import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSingingDrill } from "./useSingingDrill";
import { startListening } from "../voice/microphone";
import type { PitchFrame } from "../types";

vi.mock("../audio", () => ({ playTone: vi.fn(), playMelody: vi.fn(), playPitchGroups: vi.fn() }));

// The microphone is stood in for; what matters here is what the hook does with
// the frames it is handed, and what it does not do with them.
let deliver: ((frame: PitchFrame) => void) | undefined;
let stopped = 0;

vi.mock("../voice/microphone", () => ({
  detectMicSupport: vi.fn(() => "available"),
  startListening: vi.fn(({ onFrame }: { onFrame: (frame: PitchFrame) => void }) => {
    deliver = onFrame;
    return Promise.resolve({
      stop: () => {
        stopped += 1;
      },
    });
  }),
}));

function sing(midi: number, count = 60, startAt = 0) {
  for (let index = 0; index < count; index += 1) {
    deliver?.({ atSeconds: startAt + index * 0.02, midi, confidence: 0.9, voiced: true, level: 0.2 });
  }
}

beforeEach(() => {
  window.localStorage.clear();
  deliver = undefined;
  stopped = 0;
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSingingDrill", () => {
  it("starts on matching a single note, with no microphone open", () => {
    const { result } = renderHook(() => useSingingDrill());

    expect(result.current.stageId).toBe("match-one");
    expect(result.current.status).toBe("idle");
    // Permission is asked for on the record button, never on load.
    expect(startListening).not.toHaveBeenCalled();
  });

  it("opens the microphone only when the learner starts", async () => {
    const { result } = renderHook(() => useSingingDrill());

    await act(async () => {
      result.current.start();
    });

    expect(startListening).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("listening");
  });

  it("scores a sung take and releases the microphone", async () => {
    const { result } = renderHook(() => useSingingDrill());
    await act(async () => result.current.start());

    const target = result.current.exercise.targets[0]?.midi ?? 60;
    act(() => sing(target));
    act(() => result.current.stop());

    expect(result.current.score?.summary.inTune).toBe(true);
    expect(stopped).toBe(1);
    expect(result.current.status).toBe("idle");
  });

  it("keeps no audio, no frames, and no contour once a take ends", async () => {
    const { result } = renderHook(() => useSingingDrill());
    await act(async () => result.current.start());
    act(() => sing(result.current.exercise.targets[0]?.midi ?? 60));
    act(() => result.current.stop());

    // Everything the hook exposes after a take, serialized. If a frame or a
    // buffer survived anywhere reachable, it would show up here.
    const exposed = JSON.stringify({
      score: result.current.score,
      range: result.current.range,
      level: result.current.level,
      feedback: result.current.feedback,
    });
    expect(exposed).not.toContain("atSeconds");
    expect(exposed).not.toContain("confidence");
    expect(exposed).not.toContain("voiced");

    // And the summary — the only thing that is ever persisted — is five numbers.
    expect(Object.keys(result.current.score?.summary ?? {}).sort()).toEqual([
      "centsError",
      "durationError",
      "inTune",
      "onsetErrorMs",
      "stability",
    ]);
  });

  it("writes nothing to storage during or after a take except a range", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useSingingDrill());

    await act(async () => result.current.start());
    act(() => sing(result.current.exercise.targets[0]?.midi ?? 60));
    act(() => result.current.stop());

    // A scored take persists nothing at all: no audio, and no result either.
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("never reaches the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() => useSingingDrill());

    await act(async () => result.current.start());
    act(() => sing(result.current.exercise.targets[0]?.midi ?? 60));
    act(() => result.current.stop());

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("shows the input level while listening, and drops it when done", async () => {
    const { result } = renderHook(() => useSingingDrill());
    await act(async () => result.current.start());

    act(() => sing(60, 5));
    expect(result.current.level).toBeGreaterThan(0);

    act(() => result.current.stop());
    expect(result.current.level).toBe(0);
  });

  it("says so when permission is refused", async () => {
    vi.mocked(startListening).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useSingingDrill());

    await act(async () => result.current.start());

    expect(result.current.status).toBe("denied");
  });

  it("derives and stores a range from a calibration take", async () => {
    const { result } = renderHook(() => useSingingDrill());

    await act(async () => result.current.startCalibration());
    expect(result.current.isCalibrating).toBe(true);

    act(() => {
      for (let index = 0; index < 40; index += 1) {
        deliver?.({ atSeconds: index * 0.02, midi: 50 + index / 3, confidence: 0.9, voiced: true, level: 0.2 });
      }
    });
    act(() => result.current.stop());

    expect(result.current.range).toBeDefined();
    // Two MIDI numbers is the whole of what a calibration produces.
    expect(Object.keys(result.current.range ?? {}).sort()).toEqual(["highMidi", "lowMidi", "version"]);
    expect(window.localStorage.getItem("notesense.vocalRange.v1")).not.toBeNull();
  });

  it("writes the phrase into the learner's own range", async () => {
    window.localStorage.setItem("notesense.vocalRange.v1", JSON.stringify({ version: 1, lowMidi: 45, highMidi: 57 }));
    const { result } = renderHook(() => useSingingDrill());

    for (const target of result.current.exercise.targets) {
      expect(target.midi).toBeGreaterThanOrEqual(45);
      expect(target.midi).toBeLessThanOrEqual(57);
    }
  });

  it("changes stage and hands out a fresh phrase", async () => {
    const { result } = renderHook(() => useSingingDrill());
    const first = result.current.exercise.targets.length;

    act(() => result.current.setStage("short-phrase"));

    expect(result.current.stageId).toBe("short-phrase");
    expect(result.current.exercise.targets.length).toBeGreaterThan(first);
    expect(result.current.score).toBeNull();
  });

  it("offers a fresh phrase after a take", async () => {
    const { result } = renderHook(() => useSingingDrill());
    await act(async () => result.current.start());
    act(() => sing(result.current.exercise.targets[0]?.midi ?? 60));
    act(() => result.current.stop());
    const seed = result.current.exercise.seed;

    act(() => {
      vi.advanceTimersByTime(5);
      result.current.next();
    });

    expect(result.current.exercise.seed).not.toBe(seed);
    expect(result.current.score).toBeNull();
  });

  it("sounds the starting note on request", () => {
    const { result } = renderHook(() => useSingingDrill());

    act(() => result.current.playReference());

    // The one piece of help that does not do the exercise for the learner.
    expect(result.current.exercise.referenceMidi).toBe(result.current.exercise.targets[0]?.midi);
  });
});
