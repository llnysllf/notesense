import { describe, expect, it } from "vitest";
import { defaultSettings } from "./storage";
import { emptyProgress } from "./noteData";
import { BUILT_IN_SONGS } from "./songLibraryData";
import { generateDailyMix, getDayKey } from "./dailyMix";
import type { PracticeProgress, SongProgress } from "./types";

const ALL_SONGS_COMPLETED: SongProgress = Object.fromEntries(
  BUILT_IN_SONGS.map((song, index) => [
    song.id,
    {
      bestAccuracy: 90,
      completions: 1,
      lastPlayedAt: `2026-07-${String((index % 27) + 1).padStart(2, "0")}T00:00:00.000Z`,
    },
  ]),
);

const NOW = new Date("2026-07-24T09:00:00.000Z");

function progressWith(overrides: {
  reading?: Record<string, { attempts: number; correct: number }>;
  pitch?: Record<string, { attempts: number; correct: number }>;
}): PracticeProgress {
  return {
    ...emptyProgress,
    reading: { ...emptyProgress.reading, noteStats: { ...emptyProgress.reading.noteStats, ...overrides.reading } },
    pitch: { ...emptyProgress.pitch, noteStats: { ...emptyProgress.pitch.noteStats, ...overrides.pitch } },
  };
}

describe("generateDailyMix", () => {
  it("always builds one weakness, one review, and one reward segment", () => {
    const mix = generateDailyMix({
      progress: emptyProgress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });

    expect(mix.segments).toHaveLength(3);
    expect(mix.segments.map((segment) => segment.role)).toEqual(["weakness", "review", "reward"]);
    expect(mix.segments[2]!.target.activity).toBe("song");
    expect(mix.completedSegmentIds).toEqual([]);
    expect(mix.dayKey).toBe("2026-07-24");
  });

  it("warms up a brand-new learner on reading, reviewing pitch", () => {
    const mix = generateDailyMix({
      progress: emptyProgress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });

    expect(mix.segments[0]!.target.activity).toBe("reading");
    expect(mix.segments[1]!.target.activity).toBe("pitch");
  });

  it("puts the weaker mode in the weak-spot slot", () => {
    const progress = progressWith({
      reading: { C4: { attempts: 5, correct: 5 } },
      pitch: { C4: { attempts: 5, correct: 1 } },
    });
    const mix = generateDailyMix({
      progress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });

    expect(mix.segments[0]!.role).toBe("weakness");
    expect(mix.segments[0]!.target.activity).toBe("pitch");
    expect(mix.segments[0]!.detail).toContain("focus");
    expect(mix.segments[1]!.target.activity).toBe("reading");
  });

  it("names the weak reading notes when reading is the weaker mode", () => {
    const progress = progressWith({
      reading: { C4: { attempts: 5, correct: 1 } },
      pitch: { C4: { attempts: 5, correct: 5 } },
    });
    const mix = generateDailyMix({
      progress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });

    expect(mix.segments[0]!.target.activity).toBe("reading");
    expect(mix.segments[0]!.detail).toContain("focus C4");
    expect(mix.segments[1]!.target.activity).toBe("pitch");
  });

  it("still picks a reward song once every song has been completed", () => {
    const mix = generateDailyMix({
      progress: emptyProgress,
      songProgress: ALL_SONGS_COMPLETED,
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });
    const reward = mix.segments[2]!.target;

    expect(reward.activity).toBe("song");
    if (reward.activity === "song") {
      expect(BUILT_IN_SONGS.some((song) => song.id === reward.songId)).toBe(true);
    }
  });

  it("is deterministic within a UTC day and keys segments by day", () => {
    const first = generateDailyMix({
      progress: emptyProgress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });
    const later = generateDailyMix({
      progress: emptyProgress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: new Date("2026-07-24T21:30:00.000Z"),
    });

    expect(later.dayKey).toBe(first.dayKey);
    expect(later.segments).toEqual(first.segments);
    expect(first.segments.map((segment) => segment.id)).toEqual([
      "2026-07-24-weakness",
      "2026-07-24-review",
      "2026-07-24-reward",
    ]);
  });

  it("excludes an already-completed song from the reward slot", () => {
    const baseline = generateDailyMix({
      progress: emptyProgress,
      songProgress: {},
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });
    const rewardTarget = baseline.segments[2]!.target;
    const pickedSongId = rewardTarget.activity === "song" ? rewardTarget.songId : "";
    const songProgress: SongProgress = {
      [pickedSongId]: { bestAccuracy: 100, completions: 1, lastPlayedAt: NOW.toISOString() },
    };

    const next = generateDailyMix({
      progress: emptyProgress,
      songProgress,
      settings: defaultSettings,
      songs: BUILT_IN_SONGS,
      now: NOW,
    });
    const nextTarget = next.segments[2]!.target;

    expect(nextTarget.activity).toBe("song");
    if (nextTarget.activity === "song") {
      expect(nextTarget.songId).not.toBe(pickedSongId);
    }
  });

  it("derives the day key in UTC", () => {
    expect(getDayKey(new Date("2026-01-05T23:59:00.000Z"))).toBe("2026-01-05");
  });
});
