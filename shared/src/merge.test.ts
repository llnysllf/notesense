import { describe, expect, it } from "vitest";
import { mergePracticeData, mergePracticeProgress } from "./merge";
import { createEmptyPracticeProgress, defaultSettings, SESSION_HISTORY_LIMIT } from "./practiceData";
import type { ModeProgress, PracticeDataExport, PracticeSessionRecord, PracticeSettings } from "./types";

const baseSettings: PracticeSettings = {
  ...defaultSettings,
};

function session(overrides: Partial<PracticeSessionRecord> = {}): PracticeSessionRecord {
  return {
    id: "session",
    mode: "reading",
    completedAt: "2026-06-05T09:00:00.000Z",
    durationSeconds: 60,
    score: 5,
    attempts: 6,
    accuracy: 83,
    bestStreak: 3,
    ...overrides,
  };
}

function mode(overrides: Partial<ModeProgress> = {}): ModeProgress {
  return {
    totalAttempts: 0,
    totalCorrect: 0,
    bestRoundScore: 0,
    sessionsCompleted: 0,
    noteStats: {},
    ...overrides,
  };
}

function exportDoc(exportedAt: string, overrides: Partial<PracticeDataExport["progress"]> = {}): PracticeDataExport {
  return {
    schemaVersion: 1,
    exportedAt,
    settings: baseSettings,
    progress: {
      reading: mode(),
      pitch: mode(),
      history: [],
      ...overrides,
    },
  };
}

describe("mergePracticeData", () => {
  it("takes counters and settings from the newer document", () => {
    const older = exportDoc("2026-06-01T00:00:00.000Z", {
      reading: mode({ totalAttempts: 100, totalCorrect: 50, sessionsCompleted: 9 }),
    });
    const newer = exportDoc("2026-06-09T00:00:00.000Z", {
      reading: mode({ totalAttempts: 12, totalCorrect: 10, sessionsCompleted: 2 }),
    });
    newer.settings = { ...baseSettings, roundLength: 90 };

    const merged = mergePracticeData(older, newer);

    expect(merged.exportedAt).toBe("2026-06-09T00:00:00.000Z");
    expect(merged.settings.roundLength).toBe(90);
    expect(merged.progress.reading).toMatchObject({ totalAttempts: 12, totalCorrect: 10, sessionsCompleted: 2 });
  });

  it("keeps the maximum best-round score regardless of recency", () => {
    const older = exportDoc("2026-06-01T00:00:00.000Z", { reading: mode({ bestRoundScore: 18 }) });
    const newer = exportDoc("2026-06-09T00:00:00.000Z", { reading: mode({ bestRoundScore: 7 }) });

    expect(mergePracticeData(older, newer).progress.reading.bestRoundScore).toBe(18);
  });

  it("unions noteStats, preferring the newer document on key collisions", () => {
    const older = exportDoc("2026-06-01T00:00:00.000Z", {
      reading: mode({ noteStats: { C4: { attempts: 9, correct: 4 }, D4: { attempts: 3, correct: 3 } } }),
    });
    const newer = exportDoc("2026-06-09T00:00:00.000Z", {
      reading: mode({ noteStats: { C4: { attempts: 1, correct: 1 } } }),
    });

    const merged = mergePracticeData(older, newer).progress.reading.noteStats;

    expect(merged.C4).toEqual({ attempts: 1, correct: 1 });
    expect(merged.D4).toEqual({ attempts: 3, correct: 3 });
  });

  it("unions history by id, dedupes, sorts newest-first, and caps the length", () => {
    const olderHistory = Array.from({ length: 15 }, (_, index) =>
      session({ id: `old-${index}`, completedAt: `2026-06-02T00:${String(index).padStart(2, "0")}:00.000Z` }),
    );
    const shared = session({ id: "shared", completedAt: "2026-06-05T00:00:00.000Z" });
    const newerHistory = [
      shared,
      ...Array.from({ length: 15 }, (_, index) =>
        session({ id: `new-${index}`, completedAt: `2026-06-08T00:${String(index).padStart(2, "0")}:00.000Z` }),
      ),
    ];

    const merged = mergePracticeData(
      exportDoc("2026-06-02T00:00:00.000Z", { history: [...olderHistory, shared] }),
      exportDoc("2026-06-09T00:00:00.000Z", { history: newerHistory }),
    ).progress.history;

    expect(merged).toHaveLength(SESSION_HISTORY_LIMIT);
    expect(merged.filter((entry) => entry.id === "shared")).toHaveLength(1);
    expect(Date.parse(merged[0]!.completedAt)).toBeGreaterThanOrEqual(Date.parse(merged.at(-1)!.completedAt));
    expect(merged[0]!.id).toBe("new-14");
  });

  it("treats the first document as newer when timestamps are equal", () => {
    const a = exportDoc("2026-06-05T00:00:00.000Z", { reading: mode({ totalAttempts: 5 }) });
    const b = exportDoc("2026-06-05T00:00:00.000Z", { reading: mode({ totalAttempts: 9 }) });

    expect(mergePracticeData(a, b).progress.reading.totalAttempts).toBe(5);
  });
});

describe("mergePracticeProgress", () => {
  it("merges progress while ignoring settings", () => {
    const local = createEmptyPracticeProgress();
    local.reading.bestRoundScore = 3;
    local.history = [session({ id: "local" })];

    const remote = createEmptyPracticeProgress();
    remote.reading.bestRoundScore = 8;
    remote.reading.totalAttempts = 40;
    remote.history = [session({ id: "remote", completedAt: "2026-06-07T00:00:00.000Z" })];

    const merged = mergePracticeProgress(remote, local);

    expect(merged.reading.bestRoundScore).toBe(8);
    expect(merged.reading.totalAttempts).toBe(40);
    expect(merged.history.map((entry) => entry.id).sort()).toEqual(["local", "remote"]);
  });
});
