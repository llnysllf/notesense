import { afterEach, describe, expect, it, vi } from "vitest";
import { BASS_STARTER_NOTES, emptyProgress, PITCH_NOTES, STARTER_NOTES } from "./noteData";
import {
  createSessionRecord,
  createSessionSummary,
  formatAccuracy,
  formatDuration,
  getDailyGoalSummary,
  getFocusItems,
  getMasteryStatus,
  getMasterySummary,
  getPracticeInsightSummary,
  getPracticePlan,
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
  loadSettings,
  parsePracticeDataImport,
  recordPitchAttempt,
  recordReadingAttempt,
  resetProgress,
  saveProgress,
  saveSettings,
  serializePracticeDataExport,
} from "./storage";
import type { PracticeMode, PracticeProgress, PracticeSessionRecord } from "./types";

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

function fixtureItem<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing test fixture item at index ${index}.`);
  }

  return item;
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

function stubFailingLocalStorage() {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    },
  });
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
      previousNoteId: fixtureItem(STARTER_NOTES, 0).id,
      rng: () => 0,
      useAdaptive: false,
    });

    expect(note.id).toBe(fixtureItem(STARTER_NOTES, 1).id);
  });

  it("selects pitch notes deterministically with an injected random source", () => {
    const note = selectPitchNote({
      rng: () => 0.99,
      useAdaptive: false,
    });

    expect(note.id).toBe(fixtureItem(PITCH_NOTES, PITCH_NOTES.length - 1).id);
  });

  it("selects bass clef reading notes when the bass range is active", () => {
    const note = selectReadingNote({
      readingRange: "bass-starter",
      rng: () => 0.99,
      useAdaptive: false,
    });

    expect(note.id).toBe(fixtureItem(BASS_STARTER_NOTES, BASS_STARTER_NOTES.length - 1).id);
    expect(note.clef).toBe("bass");
  });

  it("sorts focus items by weakest accuracy first", () => {
    const progress = freshProgress();
    progress.pitch.noteStats.C4 = { attempts: 10, correct: 9 };
    progress.pitch.noteStats.D4 = { attempts: 10, correct: 3 };
    progress.pitch.noteStats.E4 = { attempts: 10, correct: 6 };

    expect(getFocusItems("pitch", progress.pitch).map((entry) => entry.note.id)).toEqual(["D4", "E4", "C4"]);
  });

  it("scopes reading focus items to the selected clef range", () => {
    const progress = freshProgress();
    progress.reading.noteStats.C4 = { attempts: 10, correct: 10 };
    progress.reading.noteStats.C3 = { attempts: 10, correct: 2 };
    progress.reading.noteStats.D3 = { attempts: 10, correct: 8 };

    expect(getFocusItems("reading", progress.reading, "bass-starter").map((entry) => entry.note.id)).toEqual([
      "C3",
      "D3",
    ]);
  });

  it("classifies mastery states from attempts and accuracy", () => {
    expect(getMasteryStatus(0, 0)).toBe("new");
    expect(getMasteryStatus(4, 75)).toBe("learning");
    expect(getMasteryStatus(8, 63)).toBe("focus");
    expect(getMasteryStatus(6, 90)).toBe("strong");
  });

  it("summarizes mastery for the selected reading range", () => {
    const progress = freshProgress();
    progress.reading.totalAttempts = 15;
    progress.reading.totalCorrect = 12;
    progress.reading.noteStats.C4 = { attempts: 5, correct: 5 };
    progress.reading.noteStats.C3 = { attempts: 8, correct: 4 };
    progress.reading.noteStats.D3 = { attempts: 4, correct: 3 };

    expect(getMasterySummary("reading", progress.reading, "bass-starter")).toMatchObject({
      averageAccuracy: 80,
      strongCount: 0,
      totalCount: 5,
      items: [
        { id: "C3", accuracy: 50, attempts: 8, status: "focus" },
        { id: "D3", accuracy: 75, attempts: 4, status: "learning" },
        { id: "E3", accuracy: 0, attempts: 0, status: "new" },
        { id: "F3", accuracy: 0, attempts: 0, status: "new" },
        { id: "G3", accuracy: 0, attempts: 0, status: "new" },
      ],
    });
  });

  it("summarizes strong pitch mastery", () => {
    const progress = freshProgress();
    progress.pitch.totalAttempts = 10;
    progress.pitch.totalCorrect = 9;
    progress.pitch.noteStats.C4 = { attempts: 5, correct: 5 };
    progress.pitch.noteStats.D4 = { attempts: 5, correct: 4 };

    const summary = getMasterySummary("pitch", progress.pitch);

    expect(summary).toMatchObject({
      averageAccuracy: 90,
      strongCount: 1,
      totalCount: PITCH_NOTES.length,
    });
    expect(summary.items.slice(0, 2)).toMatchObject([
      { id: "C4", accuracy: 100, attempts: 5, status: "strong" },
      { id: "D4", accuracy: 80, attempts: 5, status: "learning" },
    ]);
  });

  it("creates useful round summaries without inventing weak notes", () => {
    const progress = freshProgress();
    progress.reading.noteStats.C4 = { attempts: 5, correct: 5 };

    const summary = createSessionSummary("reading", progress, 5, 5, 4);

    expect(summary).toMatchObject({
      accuracy: 100,
      bestStreak: 4,
      suggestion: "Next: keep the same range and try to beat this score.",
    });
    expect("focusItem" in summary).toBe(false);
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

  it("summarizes an empty daily goal", () => {
    expect(getDailyGoalSummary([], new Date("2026-06-06T12:00:00.000Z"))).toEqual({
      targetSessions: 1,
      completedSessions: 0,
      completionPercent: 0,
      isComplete: false,
      currentStreak: 0,
      bestStreak: 0,
      todayPracticeSeconds: 0,
      nextAction: "Finish 1 more round today.",
    });
  });

  it("counts today's practice and completed streaks", () => {
    const history = [
      session({
        id: "today",
        completedAt: "2026-06-06T09:00:00.000Z",
        durationSeconds: 75,
      }),
      session({
        id: "yesterday",
        completedAt: "2026-06-05T09:00:00.000Z",
        durationSeconds: 60,
      }),
      session({
        id: "two-days-ago",
        completedAt: "2026-06-04T09:00:00.000Z",
        durationSeconds: 45,
      }),
      session({
        id: "older",
        completedAt: "2026-06-02T09:00:00.000Z",
        durationSeconds: 60,
      }),
    ];

    expect(getDailyGoalSummary(history, new Date("2026-06-06T12:00:00.000Z"))).toMatchObject({
      completedSessions: 1,
      completionPercent: 100,
      isComplete: true,
      currentStreak: 3,
      bestStreak: 3,
      todayPracticeSeconds: 75,
      nextAction: "Goal complete. Keep the streak alive tomorrow.",
    });
  });

  it("keeps yesterday's streak visible before today's round", () => {
    const history = [
      session({
        id: "yesterday",
        completedAt: "2026-06-05T09:00:00.000Z",
      }),
      session({
        id: "two-days-ago",
        completedAt: "2026-06-04T09:00:00.000Z",
      }),
    ];

    expect(getDailyGoalSummary(history, new Date("2026-06-06T12:00:00.000Z"))).toMatchObject({
      completedSessions: 0,
      isComplete: false,
      currentStreak: 2,
      bestStreak: 2,
      nextAction: "Finish 1 more round today.",
    });
  });

  it("creates chronological practice insight trends from recent sessions", () => {
    const history = [
      session({ id: "new", score: 5, attempts: 5, accuracy: 100, bestStreak: 5, durationSeconds: 45 }),
      session({ id: "previous", score: 3, attempts: 5, accuracy: 60, bestStreak: 2, durationSeconds: 30 }),
      session({ id: "pitch", mode: "pitch", score: 1, attempts: 5, accuracy: 20 }),
      session({ id: "old", score: 4, attempts: 5, accuracy: 80, bestStreak: 4, durationSeconds: 60 }),
    ];

    expect(getPracticeInsightSummary(history, "reading")).toMatchObject({
      trendPoints: [
        { id: "old", label: "Round 1", accuracy: 80 },
        { id: "previous", label: "Round 2", accuracy: 60 },
        { id: "new", label: "Round 3", accuracy: 100 },
      ],
      latestAccuracy: 100,
      accuracyDelta: 40,
      bestStreak: 5,
      totalPracticeSeconds: 135,
    });
  });

  it("returns empty practice insights when no sessions match the mode", () => {
    expect(getPracticeInsightSummary([session({ mode: "pitch" })], "reading")).toEqual({
      trendPoints: [],
      latestAccuracy: 0,
      accuracyDelta: 0,
      bestStreak: 0,
      totalPracticeSeconds: 0,
    });
  });

  it("recommends a baseline plan before enough answers exist", () => {
    expect(
      getPracticePlan({
        adaptivePractice: true,
        mode: "reading",
        progress: freshProgress(),
        readingRange: "treble-starter",
        roundLength: 60,
      }),
    ).toMatchObject({
      tone: "baseline",
      title: "Build baseline",
      focus: "Treble clef C4-G4",
      target: "5 more answers",
    });
  });

  it("recommends the weakest saved note within the active reading range", () => {
    const progress = freshProgress();
    progress.reading.totalAttempts = 24;
    progress.reading.totalCorrect = 16;
    progress.reading.noteStats.C4 = { attempts: 12, correct: 2 };
    progress.reading.noteStats.C3 = { attempts: 12, correct: 9 };

    expect(
      getPracticePlan({
        adaptivePractice: false,
        mode: "reading",
        progress,
        readingRange: "bass-starter",
        roundLength: 30,
      }),
    ).toMatchObject({
      tone: "focus",
      title: "Focus C3",
      focus: "75% accuracy",
      target: "85% on C3",
      steps: ["One 30s note reading round", "Turn on adaptive practice", "Slow answers on C3"],
    });
  });

  it("recommends recovery when recent accuracy drops sharply", () => {
    const progress = freshProgress();
    progress.pitch.totalAttempts = 12;
    progress.pitch.totalCorrect = 10;
    progress.pitch.noteStats.C4 = { attempts: 6, correct: 6 };
    progress.pitch.noteStats.D4 = { attempts: 6, correct: 6 };
    progress.history = [
      session({ id: "latest", mode: "pitch", accuracy: 70, score: 7, attempts: 10 }),
      session({ id: "previous", mode: "pitch", accuracy: 90, score: 9, attempts: 10 }),
    ];

    expect(
      getPracticePlan({
        adaptivePractice: true,
        mode: "pitch",
        progress,
        roundLength: 90,
      }),
    ).toMatchObject({
      tone: "recovery",
      title: "Stabilize accuracy",
      focus: "70% latest",
      target: "Back to 80%",
    });
  });

  it("recommends a stretch plan after consistently strong recent rounds", () => {
    const progress = freshProgress();
    progress.reading.totalAttempts = 20;
    progress.reading.totalCorrect = 19;
    progress.reading.noteStats.C4 = { attempts: 10, correct: 10 };
    progress.reading.noteStats.D4 = { attempts: 10, correct: 9 };
    progress.history = [
      session({ id: "latest", accuracy: 95, score: 19, attempts: 20 }),
      session({ id: "previous", accuracy: 90, score: 18, attempts: 20 }),
      session({ id: "old", accuracy: 90, score: 18, attempts: 20 }),
    ];

    expect(
      getPracticePlan({
        adaptivePractice: true,
        mode: "reading",
        progress,
        readingRange: "treble-starter",
        roundLength: 60,
      }),
    ).toMatchObject({
      tone: "advance",
      title: "Ready to stretch",
      focus: "92% recent avg",
      target: "Hold 90% again",
    });
  });
});

describe("storage progress reducers", () => {
  it("records reading and pitch attempts independently", () => {
    let progress = freshProgress();
    progress = recordReadingAttempt(progress, fixtureItem(STARTER_NOTES, 0), "C");
    progress = recordPitchAttempt(progress, fixtureItem(PITCH_NOTES, 4), "C");

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
    expect(progress.history.at(0)?.id).toBe(`session-${SESSION_HISTORY_LIMIT + 1}`);
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

  it("loads legacy v1 progress from the original storage key", () => {
    stubLocalStorage({
      "notesense.progress.v1": JSON.stringify({
        totalAttempts: 6,
        totalCorrect: 4,
        bestRoundScore: 3,
        sessionsCompleted: 2,
        noteStats: {
          D4: { attempts: 6, correct: 4 },
        },
      }),
    });

    const progress = loadProgress();

    expect(progress.reading).toMatchObject({
      totalAttempts: 6,
      totalCorrect: 4,
      bestRoundScore: 3,
      sessionsCompleted: 2,
    });
    expect(progress.reading.noteStats.D4).toEqual({ attempts: 6, correct: 4 });
    expect(progress.pitch.totalAttempts).toBe(0);
    expect(progress.history).toEqual([]);
  });

  it("falls back to empty progress when progress storage is missing or unreadable", () => {
    stubLocalStorage({});
    expect(loadProgress()).toEqual(emptyProgress);

    stubFailingLocalStorage();
    expect(loadProgress()).toEqual(emptyProgress);
  });

  it("normalizes stored session history defensively", () => {
    stubLocalStorage({
      "notesense.progress.v2": JSON.stringify({
        reading: {},
        pitch: {},
        history: [
          null,
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

  it("ignores malformed note-stat records while preserving defaults", () => {
    stubLocalStorage({
      "notesense.progress.v2": JSON.stringify({
        reading: {
          totalAttempts: 2,
          totalCorrect: 1,
          noteStats: {
            C4: null,
            D4: { attempts: 2, correct: 1 },
          },
        },
        pitch: {},
        history: [],
      }),
    });

    const progress = loadProgress();

    expect(progress.reading.noteStats.C4).toEqual({ attempts: 0, correct: 0 });
    expect(progress.reading.noteStats.D4).toEqual({ attempts: 2, correct: 1 });
  });

  it("loads settings with defaults for missing, invalid, or unsafe values", () => {
    stubLocalStorage({});
    expect(loadSettings()).toEqual(defaultSettings);

    stubLocalStorage({
      "notesense.settings.v3": JSON.stringify({
        roundLength: 45,
        readingRange: "wide-range",
        adaptivePractice: false,
        autoPlayPitch: false,
        revealPitchAfterAnswer: false,
      }),
    });
    expect(loadSettings()).toEqual({
      ...defaultSettings,
      adaptivePractice: false,
      autoPlayPitch: false,
      revealPitchAfterAnswer: false,
    });

    stubFailingLocalStorage();
    expect(loadSettings()).toEqual(defaultSettings);
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

  it("resets progress to the empty local-first baseline", () => {
    expect(resetProgress()).toEqual(emptyProgress);
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
    expect(exportData.progress.history.at(0)?.id).toBe("export-session");
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
    expect(importResult.data.progress.history.at(0)?.id).toBe("import-session");
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
          readingRange: "bass-starter",
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
      readingRange: "bass-starter",
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
