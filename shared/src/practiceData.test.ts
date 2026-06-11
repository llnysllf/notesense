import { describe, expect, it } from "vitest";
import {
  createEmptyPracticeProgress,
  isReadingRange,
  normalizeProgress,
  normalizeSettings,
  parsePracticeDataImport,
} from "./practiceData";

// The web app covers the catalog-seeded path via storage.ts; these tests cover the
// catalog-less path the sync backend uses to validate untrusted documents.

describe("createEmptyPracticeProgress", () => {
  it("returns zeroed counters with no seeded note stats", () => {
    const empty = createEmptyPracticeProgress();

    expect(empty.reading).toEqual({
      totalAttempts: 0,
      totalCorrect: 0,
      bestRoundScore: 0,
      sessionsCompleted: 0,
      noteStats: {},
    });
    expect(empty.pitch.noteStats).toEqual({});
    expect(empty.history).toEqual([]);
  });

  it("returns a fresh object each call", () => {
    const first = createEmptyPracticeProgress();
    first.reading.totalAttempts = 5;

    expect(createEmptyPracticeProgress().reading.totalAttempts).toBe(0);
  });
});

describe("catalog-less normalization (server path)", () => {
  it("keeps only the note stats present in the input, clamped defensively", () => {
    const normalized = normalizeProgress(
      {
        reading: {
          totalAttempts: "10.6",
          totalCorrect: 99,
          noteStats: { C4: { attempts: "4", correct: 9 }, bogus: null },
        },
        pitch: {},
        history: [{ mode: "pitch", id: "x", completedAt: "2026-06-05T09:00:00.000Z", score: 9, attempts: 4 }],
      },
      createEmptyPracticeProgress(),
    );

    expect(normalized.reading.totalAttempts).toBe(11);
    expect(normalized.reading.totalCorrect).toBe(11);
    expect(normalized.reading.noteStats).toEqual({ C4: { attempts: 4, correct: 4 } });
    expect(normalized.reading.noteStats.bogus).toBeUndefined();
    expect(normalized.history[0]).toMatchObject({ mode: "pitch", score: 4, accuracy: 100 });
  });

  it("validates reading ranges and settings", () => {
    expect(isReadingRange("treble-starter")).toBe(true);
    expect(isReadingRange("bass-starter")).toBe(true);
    expect(isReadingRange("wide-range")).toBe(false);

    expect(normalizeSettings({ roundLength: 45, readingRange: "nope" })).toMatchObject({
      roundLength: 60,
      readingRange: "treble-starter",
    });
  });

  it("parses a valid export against the catalog-less seed", () => {
    const result = parsePracticeDataImport(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-06-05T10:00:00.000Z",
        progress: { reading: {}, pitch: {}, history: [] },
        settings: { roundLength: 90, readingRange: "bass-starter" },
      }),
      createEmptyPracticeProgress(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.data.settings).toMatchObject({ roundLength: 90, readingRange: "bass-starter" });
    expect(result.data.progress.reading.noteStats).toEqual({});
  });
});
