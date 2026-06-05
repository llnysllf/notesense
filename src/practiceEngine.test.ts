import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProgress, PITCH_NOTES, STARTER_NOTES } from "./noteData";
import {
  createSessionRecord,
  createSessionSummary,
  formatAccuracy,
  formatDuration,
  getFocusItems,
  getPracticeWeight,
  getSessionHistorySummary,
  selectPitchNote,
  selectReadingNote,
} from "./practiceEngine";
import {
  SESSION_HISTORY_LIMIT,
  completeRound,
  createExportFileName,
  createPracticeDataExport,
  defaultSettings,
  loadProgress,
  parsePracticeDataImport,
  recordPitchAttempt,
  recordReadingAttempt,
  saveProgress,
  saveSettings,
  serializePracticeDataExport,
} from "./storage";
import type { PracticeMode, PracticeProgress, PracticeSessionRecord } from "./types";

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

function session(overrides: Partial<PracticeSessionRecord> = {}): PracticeSessionRecord {
  return {
    id: "session-1",
    mode: "reading",
    completedAt: "2026-06-05T09:00:00.000Z",
    durationSeconds: 60,
    score: 4,
    attempts: 5,
    accuracy: 80,
    bestStreak: 3,
    ...overrides,
  };
}

function stubLocalStorage(initialState: Record<string, string>, shouldFailWrites = false) {
  const store = new Map(Object.entries(initialState));

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (shouldFailWrites) {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }

        store.set(key, value);
      },
    },
  });

  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("practiceEngine", () => {
  it("formats zero and non-zero accuracy safely", () => {
    expect(formatAccuracy(0, 0)).toBe("0%");
    expect(formatAccuracy(7, 9)).toBe("78%");
  });

  it("formats session durations for compact analytics", () => {
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(95)).toBe("1m 35s");
  });

  it("weights weak notes above mastered notes", () => {
    const progress = freshProgress();
    progress.reading.noteStats.C4 = { attempts: 10, correct: 2 };
    progress.reading.noteStats.D4 = { attempts: 10, correct: 10 };

    expect(getPracticeWeight("C4", progress.reading)).toBeGreaterThan(getPracticeWeight("D4", progress.reading));
    expect(getPracticeWeight("E4", progress.reading)).toBeGreaterThan(getPracticeWeight("D4", progress.reading));
  });

  it("avoids immediately repeating the previous reading note when possible", () => {
    const note = selectReadingNote({
      previousNoteId: STARTER_NOTES[0].id,
      rng: () => 0,
      useAdaptive: false,
    });

    expect(note.id).toBe(STARTER_NOTES[1].id);
  });

  it("selects pitch notes deterministically with an injected random source", () => {
    const note = selectPitchNote({
      rng: () => 0.99,
      useAdaptive: false,
    });

    expect(note.id).toBe(PITCH_NOTES[PITCH_NOTES.length - 1].id);
  });

  it("sorts focus items by weakest accuracy first", () => {
    const progress = freshProgress();
    progress.pitch.noteStats.C4 = { attempts: 10, correct: 9 };
    progress.pitch.noteStats.D4 = { attempts: 10, correct: 3 };
    progress.pitch.noteStats.E4 = { attempts: 10, correct: 6 };

    expect(getFocusItems("pitch", progress.pitch).map((entry) => entry.note.id)).toEqual(["D4", "E4", "C4"]);
  });

  it("creates useful round summaries without inventing weak notes", () => {
    const progress = freshProgress();
    progress.reading.noteStats.C4 = { attempts: 5, correct: 5 };

    expect(createSessionSummary("reading", progress, 5, 5, 4)).toMatchObject({
      accuracy: 100,
      bestStreak: 4,
      focusItem: undefined,
      suggestion: "Next: keep the same range and try to beat this score.",
    });
  });

  it("creates summaries that recommend genuinely weak notes", () => {
    const progress = freshProgress();
    progress.reading.noteStats.F4 = { attempts: 8, correct: 3 };

    expect(createSessionSummary("reading", progress, 3, 8, 2)).toMatchObject({
      accuracy: 38,
      focusItem: "F4",
      suggestion: "Next: spend one short round on F4.",
    });
  });

  it("creates normalized session records from round data", () => {
    expect(
      createSessionRecord({
        id: "reading-demo",
        mode: "reading",
        completedAt: "2026-06-05T09:00:00.000Z",
        durationSeconds: 58.6,
        score: 9,
        attempts: 10,
        bestStreak: 4,
      }),
    ).toEqual({
      id: "reading-demo",
      mode: "reading",
      completedAt: "2026-06-05T09:00:00.000Z",
      durationSeconds: 59,
      score: 9,
      attempts: 10,
      accuracy: 90,
      bestStreak: 4,
    });
  });

  it("summarizes recent history by mode", () => {
    const history = [
      session({ id: "new", score: 3, attempts: 4, accuracy: 75, bestStreak: 2 }),
      session({ id: "pitch", mode: "pitch", score: 1, attempts: 5, accuracy: 20 }),
      session({ id: "old", score: 5, attempts: 6, accuracy: 83, durationSeconds: 30, bestStreak: 5 }),
    ];

    expect(getSessionHistorySummary(history, "reading")).toMatchObject({
      recentSessions: [history[0], history[2]],
      averageAccuracy: 80,
      totalAttempts: 10,
      totalPracticeSeconds: 90,
      bestStreak: 5,
    });
  });
});

describe("storage progress reducers", () => {
  it("records reading and pitch attempts independently", () => {
    let progress = freshProgress();
    progress = recordReadingAttempt(progress, STARTER_NOTES[0], "C");
    progress = recordPitchAttempt(progress, PITCH_NOTES[4], "C");

    expect(progress.reading).toMatchObject({ totalAttempts: 1, totalCorrect: 1 });
    expect(progress.pitch).toMatchObject({ totalAttempts: 1, totalCorrect: 0 });
    expect(progress.pitch.noteStats.G4).toEqual({ attempts: 1, correct: 0 });
  });

  it("completes a round without touching the other mode", () => {
    const progress = completeRound(freshProgress(), session({ mode: "pitch", score: 6, attempts: 8, accuracy: 75 }));

    expect(progress.pitch.bestRoundScore).toBe(6);
    expect(progress.pitch.sessionsCompleted).toBe(1);
    expect(progress.reading.sessionsCompleted).toBe(0);
    expect(progress.history).toHaveLength(1);
    expect(progress.history[0]).toMatchObject({ mode: "pitch", score: 6 });
  });

  it("caps session history to the newest saved rounds", () => {
    const progress = Array.from({ length: SESSION_HISTORY_LIMIT + 2 }).reduce<PracticeProgress>(
      (currentProgress, _, index) => {
        const mode: PracticeMode = index % 2 === 0 ? "reading" : "pitch";
        return completeRound(
          currentProgress,
          session({
            id: `session-${index}`,
            mode,
            completedAt: `2026-06-05T09:${String(index).padStart(2, "0")}:00.000Z`,
          }),
        );
      },
      freshProgress(),
    );

    expect(progress.history).toHaveLength(SESSION_HISTORY_LIMIT);
    expect(progress.history[0].id).toBe(`session-${SESSION_HISTORY_LIMIT + 1}`);
    expect(progress.history.at(-1)?.id).toBe("session-2");
  });

  it("loads older progress without requiring session history", () => {
    stubLocalStorage({
      "notesense.progress.v2": JSON.stringify({
        reading: {
          totalAttempts: 2,
          totalCorrect: 1,
          bestRoundScore: 1,
          sessionsCompleted: 1,
          noteStats: {
            C4: { attempts: 2, correct: 1 },
          },
        },
      }),
    });

    const progress = loadProgress();

    expect(progress.history).toEqual([]);
    expect(progress.reading.noteStats.C4).toEqual({ attempts: 2, correct: 1 });
    expect(progress.pitch.totalAttempts).toBe(0);
  });

  it("normalizes stored session history defensively", () => {
    stubLocalStorage({
      "notesense.progress.v2": JSON.stringify({
        reading: {},
        pitch: {},
        history: [
          session({ id: "old", completedAt: "2026-06-05T08:00:00.000Z", score: 1, attempts: 4, accuracy: 100 }),
          session({
            id: "new",
            mode: "pitch",
            completedAt: "2026-06-05T09:00:00.000Z",
            score: 3,
            attempts: 4,
            accuracy: 0,
          }),
          { id: "invalid", mode: "unsupported" },
        ],
      }),
    });

    const progress = loadProgress();

    expect(progress.history.map((entry) => entry.id)).toEqual(["new", "old"]);
    expect(progress.history[0]).toMatchObject({ accuracy: 75, mode: "pitch" });
    expect(progress.history[1]).toMatchObject({ accuracy: 25, mode: "reading" });
  });

  it("reports storage write failures without throwing", () => {
    stubLocalStorage({}, true);

    expect(saveProgress(freshProgress())).toBe(false);
    expect(saveSettings(defaultSettings)).toBe(false);
  });

  it("saves progress and settings when storage is available", () => {
    const store = stubLocalStorage({});

    expect(saveProgress(freshProgress())).toBe(true);
    expect(saveSettings(defaultSettings)).toBe(true);
    expect(store.has("notesense.progress.v2")).toBe(true);
    expect(store.has("notesense.settings.v3")).toBe(true);
  });

  it("creates versioned practice data exports", () => {
    const progress = completeRound(
      freshProgress(),
      session({ id: "export-session", completedAt: "2026-06-05T09:00:00.000Z" }),
    );
    const exportData = createPracticeDataExport(progress, defaultSettings, "2026-06-05T10:00:00.000Z");
    const serializedExport = serializePracticeDataExport(progress, defaultSettings, "2026-06-05T10:00:00.000Z");

    expect(exportData).toMatchObject({
      schemaVersion: 1,
      exportedAt: "2026-06-05T10:00:00.000Z",
      settings: defaultSettings,
    });
    expect(exportData.progress.history[0].id).toBe("export-session");
    expect(JSON.parse(serializedExport)).toMatchObject(exportData);
  });

  it("creates stable export filenames", () => {
    expect(createExportFileName(new Date("2026-06-05T10:00:00.000Z"))).toBe("notesense-progress-2026-06-05.json");
  });

  it("parses exported practice data for import", () => {
    const progress = completeRound(
      freshProgress(),
      session({ id: "import-session", completedAt: "2026-06-05T09:00:00.000Z" }),
    );
    const importResult = parsePracticeDataImport(
      serializePracticeDataExport(progress, defaultSettings, "2026-06-05T10:00:00.000Z"),
    );

    expect(importResult.ok).toBe(true);
    if (!importResult.ok) {
      throw new Error(importResult.error);
    }

    expect(importResult.data).toMatchObject({
      schemaVersion: 1,
      exportedAt: "2026-06-05T10:00:00.000Z",
      settings: defaultSettings,
    });
    expect(importResult.data.progress.history[0].id).toBe("import-session");
  });

  it("normalizes imported practice data defensively", () => {
    const importResult = parsePracticeDataImport(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "not a date",
        progress: {
          reading: {
            totalAttempts: "8.2",
            totalCorrect: 20,
            bestRoundScore: "5",
            sessionsCompleted: "2",
            noteStats: {
              C4: { attempts: "4", correct: 9 },
            },
          },
          pitch: {},
          history: [session({ score: 20, attempts: 5, accuracy: 0 })],
        },
        settings: {
          roundLength: 90,
          adaptivePractice: false,
          autoPlayPitch: "yes",
        },
      }),
    );

    expect(importResult.ok).toBe(true);
    if (!importResult.ok) {
      throw new Error(importResult.error);
    }

    expect(importResult.data.exportedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(importResult.data.progress.reading).toMatchObject({
      totalAttempts: 8,
      totalCorrect: 8,
      bestRoundScore: 5,
      sessionsCompleted: 2,
    });
    expect(importResult.data.progress.reading.noteStats.C4).toEqual({ attempts: 4, correct: 4 });
    expect(importResult.data.progress.history[0]).toMatchObject({ score: 5, accuracy: 100 });
    expect(importResult.data.settings).toEqual({
      ...defaultSettings,
      roundLength: 90,
      adaptivePractice: false,
    });
  });

  it("rejects invalid practice data imports", () => {
    expect(parsePracticeDataImport("{").ok).toBe(false);
    expect(parsePracticeDataImport(JSON.stringify({ schemaVersion: 1 })).ok).toBe(false);
  });

  it("rejects unsupported practice data export versions", () => {
    const importResult = parsePracticeDataImport(
      JSON.stringify({
        schemaVersion: 2,
        exportedAt: "2026-06-05T10:00:00.000Z",
        progress: freshProgress(),
        settings: defaultSettings,
      }),
    );

    expect(importResult).toEqual({
      ok: false,
      error: "This NoteSense export version is not supported.",
    });
  });
});
