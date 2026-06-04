import { describe, expect, it } from "vitest";
import { emptyProgress, PITCH_NOTES, STARTER_NOTES } from "./noteData";
import {
  createSessionSummary,
  formatAccuracy,
  getFocusItems,
  getPracticeWeight,
  selectPitchNote,
  selectReadingNote,
} from "./practiceEngine";
import { completeRound, recordPitchAttempt, recordReadingAttempt } from "./storage";
import type { PracticeProgress } from "./types";

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

describe("practiceEngine", () => {
  it("formats zero and non-zero accuracy safely", () => {
    expect(formatAccuracy(0, 0)).toBe("0%");
    expect(formatAccuracy(7, 9)).toBe("78%");
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
    const progress = completeRound(freshProgress(), "pitch", 6);

    expect(progress.pitch.bestRoundScore).toBe(6);
    expect(progress.pitch.sessionsCompleted).toBe(1);
    expect(progress.reading.sessionsCompleted).toBe(0);
  });
});
