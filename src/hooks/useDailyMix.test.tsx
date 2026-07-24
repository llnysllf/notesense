import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../storage";
import { emptyProgress } from "../noteData";
import { useDailyMix, type UseDailyMixOptions } from "./useDailyMix";
import type { MixSegment, SessionSummary } from "../types";

const SUMMARY: SessionSummary = {
  mode: "reading",
  score: 8,
  attempts: 10,
  accuracy: 80,
  bestStreak: 4,
  suggestion: "Nice work",
};

const PITCH_SEGMENT: MixSegment = {
  id: "seg-pitch",
  role: "weakness",
  title: "Pitch training",
  detail: "",
  estimatedSeconds: 60,
  target: { activity: "pitch", pitchRange: "chromatic", pitchExercise: "single" },
};

const UNKNOWN_SONG_SEGMENT: MixSegment = {
  id: "seg-song",
  role: "reward",
  title: "Mystery",
  detail: "",
  estimatedSeconds: 40,
  target: { activity: "song", songId: "does-not-exist" },
};

function baseOptions(overrides: Partial<UseDailyMixOptions> = {}): UseDailyMixOptions {
  return {
    progress: emptyProgress,
    songProgress: {},
    settings: defaultSettings,
    lastSummary: null,
    songStatus: "idle",
    onConfigureDrill: vi.fn(),
    onOpenSong: vi.fn(),
    onNavigate: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

function storedMix() {
  return JSON.parse(window.localStorage.getItem("notesense.dailyMix.v1") ?? "null");
}

describe("useDailyMix", () => {
  it("generates and persists a mix on first mount", async () => {
    const { result } = renderHook(() => useDailyMix(baseOptions()));

    await waitFor(() => expect(result.current.mix).not.toBeNull());
    expect(result.current.mix!.segments).toHaveLength(3);
    expect(storedMix().dayKey).toBe(result.current.mix!.dayKey);
  });

  it("reuses a persisted same-day mix, keeping completed segments", async () => {
    const first = renderHook(() => useDailyMix(baseOptions()));
    await waitFor(() => expect(first.result.current.mix).not.toBeNull());
    const completedId = first.result.current.mix!.segments[0]!.id;
    window.localStorage.setItem(
      "notesense.dailyMix.v1",
      JSON.stringify({ ...storedMix(), completedSegmentIds: [completedId] }),
    );

    const second = renderHook(() => useDailyMix(baseOptions()));
    expect(second.result.current.mix?.completedSegmentIds).toEqual([completedId]);
  });

  it("launches a drill segment by configuring the drill and navigating to practice", async () => {
    const onConfigureDrill = vi.fn();
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useDailyMix(baseOptions({ onConfigureDrill, onNavigate })));
    await waitFor(() => expect(result.current.mix).not.toBeNull());

    act(() => result.current.startSegment(result.current.mix!.segments[0]!));

    expect(onConfigureDrill).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("practice");
  });

  it("marks a launched drill segment complete when the round finishes", async () => {
    const { result, rerender } = renderHook((props: UseDailyMixOptions) => useDailyMix(props), {
      initialProps: baseOptions(),
    });
    await waitFor(() => expect(result.current.mix).not.toBeNull());
    const drillSegment = result.current.mix!.segments[0]!;

    act(() => result.current.startSegment(drillSegment));
    act(() => rerender(baseOptions({ lastSummary: SUMMARY })));

    expect(result.current.mix!.completedSegmentIds).toContain(drillSegment.id);
    expect(storedMix().completedSegmentIds).toContain(drillSegment.id);
  });

  it("marks the reward song segment complete when the song finishes", async () => {
    const onOpenSong = vi.fn();
    const onNavigate = vi.fn();
    const { result, rerender } = renderHook((props: UseDailyMixOptions) => useDailyMix(props), {
      initialProps: baseOptions({ onOpenSong, onNavigate }),
    });
    await waitFor(() => expect(result.current.mix).not.toBeNull());
    const rewardSegment = result.current.mix!.segments[2]!;

    act(() => result.current.startSegment(rewardSegment));
    await waitFor(() => expect(onOpenSong).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith("songs");

    act(() => rerender(baseOptions({ onOpenSong, onNavigate, songStatus: "complete" })));
    expect(result.current.mix!.completedSegmentIds).toContain(rewardSegment.id);
  });

  it("configures a pitch drill when starting a pitch segment", async () => {
    const onConfigureDrill = vi.fn();
    const { result } = renderHook(() => useDailyMix(baseOptions({ onConfigureDrill })));
    await waitFor(() => expect(result.current.mix).not.toBeNull());

    act(() => result.current.startSegment(PITCH_SEGMENT));

    expect(onConfigureDrill).toHaveBeenCalledWith(
      "pitch",
      expect.objectContaining({ pitchRange: "chromatic", pitchExercise: "single" }),
    );
  });

  it("navigates to songs even when the reward song is missing", async () => {
    const onOpenSong = vi.fn();
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useDailyMix(baseOptions({ onOpenSong, onNavigate })));
    await waitFor(() => expect(result.current.mix).not.toBeNull());

    act(() => result.current.startSegment(UNKNOWN_SONG_SEGMENT));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("songs"));
    expect(onOpenSong).not.toHaveBeenCalled();
  });

  it("regenerates the mix when the day changes and the window regains focus", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    const { result } = renderHook(() => useDailyMix(baseOptions()));
    await waitFor(() => expect(result.current.mix).not.toBeNull());
    expect(result.current.mix!.dayKey).toBe("2026-07-24");
    const sameDayMix = result.current.mix;

    // Focus on the same day keeps the existing mix.
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current.mix).toBe(sameDayMix);

    vi.setSystemTime(new Date("2026-07-25T08:00:00.000Z"));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(result.current.mix!.dayKey).toBe("2026-07-25"));
  });

  it("regenerates a fresh mix and clears completion", async () => {
    const { result, rerender } = renderHook((props: UseDailyMixOptions) => useDailyMix(props), {
      initialProps: baseOptions(),
    });
    await waitFor(() => expect(result.current.mix).not.toBeNull());
    const drillSegment = result.current.mix!.segments[0]!;
    act(() => result.current.startSegment(drillSegment));
    act(() => rerender(baseOptions({ lastSummary: SUMMARY })));
    expect(result.current.mix!.completedSegmentIds).toContain(drillSegment.id);

    act(() => result.current.regenerate());
    await waitFor(() => expect(result.current.mix!.completedSegmentIds).toEqual([]));
  });
});
