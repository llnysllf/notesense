import { describe, expect, it } from "vitest";
import { ticksToSeconds } from "../music/compileTimeline";
import { buildAssessmentPassage, type AssessmentPassage } from "./passage";
import {
  describeReadingScore,
  isTrendworthy,
  scoreReadingAssessment,
  MIN_CONFIDENT_COVERAGE,
  READING_SCORE_ALGORITHM_VERSION,
  type AssessmentAnswer,
} from "./readingScore";

const passage = buildAssessmentPassage({ difficulty: 0.5, seed: "score-fixture" });

function onsetSeconds(form: AssessmentPassage): number[] {
  return form.notes.map((note) => ticksToSeconds(note.onsetTicks, form.bpm, form.transport));
}

// A run played exactly as notated, with every pitch right.
function perfectRun(form: AssessmentPassage, offsetSeconds = 0): AssessmentAnswer[] {
  return form.notes.map((note, index) => ({
    expectedMidi: note.midi,
    playedMidi: note.midi,
    playedSeconds: (onsetSeconds(form)[index] as number) + offsetSeconds,
  }));
}

describe("reading score", () => {
  it("scores an empty run as zeros rather than NaN", () => {
    const result = scoreReadingAssessment({ passage, answers: [] });

    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    for (const value of Object.values(result.components)) {
      expect(Number.isNaN(value)).toBe(false);
      expect(value).toBe(0);
    }
  });

  it("scores an attempted-but-silent run as zeros rather than NaN", () => {
    const answers = passage.notes.map((note) => ({ expectedMidi: note.midi }));
    const result = scoreReadingAssessment({ passage, answers });

    expect(result.score).toBe(0);
    expect(result.notesPlayed).toBe(0);
    expect(Number.isNaN(result.components.fluency)).toBe(false);
  });

  it("gives a near-perfect score to a passage played as notated", () => {
    const result = scoreReadingAssessment({ passage, answers: perfectRun(passage) });

    expect(result.components.noteAccuracy).toBe(1);
    expect(result.components.rhythmAccuracy).toBe(1);
    expect(result.components.continuity).toBe(1);
    expect(result.components.fluency).toBeGreaterThan(0.95);
    expect(result.score).toBeGreaterThanOrEqual(99);
    expect(result.confidence).toBe(1);
  });

  it("keeps the components separate, so wrong notes in time read differently from right notes out of time", () => {
    const wrongNotes = perfectRun(passage).map((answer) => ({ ...answer, playedMidi: answer.expectedMidi + 1 }));
    const result = scoreReadingAssessment({ passage, answers: wrongNotes });

    expect(result.components.noteAccuracy).toBe(0);
    // The learner still played in time, and the score says so.
    expect(result.components.rhythmAccuracy).toBe(1);
    expect(result.score).toBeGreaterThan(0);
  });

  it("corrects for a declared device delay instead of blaming the learner", () => {
    // Bigger than the tolerance band at this tempo, so an uncorrected run
    // genuinely fails rather than being quietly forgiven.
    const late = perfectRun(passage, 0.25);

    const uncorrected = scoreReadingAssessment({ passage, answers: late });
    const corrected = scoreReadingAssessment({ passage, answers: late, latencyMs: 250 });

    expect(corrected.components.rhythmAccuracy).toBeGreaterThan(uncorrected.components.rhythmAccuracy);
    expect(corrected.components.rhythmAccuracy).toBe(1);
  });

  it("marks stalling as a continuity problem, not a note problem", () => {
    const answers = perfectRun(passage).map((answer, index) =>
      // Stop dead in the middle, then carry on.
      index >= 6 ? { ...answer, playedSeconds: (answer.playedSeconds as number) + 6 } : answer,
    );
    const result = scoreReadingAssessment({ passage, answers });

    expect(result.components.noteAccuracy).toBe(1);
    expect(result.components.continuity).toBeLessThan(1);
    expect(describeReadingScore(result)).toMatch(/stopped to work notes out|rhythm/i);
  });

  it("does not let stopping early look like fluency", () => {
    const answers = perfectRun(passage).map((answer, index) =>
      index < 3 ? answer : { expectedMidi: answer.expectedMidi },
    );
    const result = scoreReadingAssessment({ passage, answers });

    expect(result.components.fluency).toBeLessThan(0.5);
    expect(result.confidence).toBeLessThan(MIN_CONFIDENT_COVERAGE);
    // A result this thin is shown, but it is not allowed onto the trend line.
    expect(isTrendworthy(result)).toBe(false);
  });

  it("never claims to be calibrated", () => {
    const result = scoreReadingAssessment({ passage, answers: perfectRun(passage) });

    expect(result.isProvisional).toBe(true);
    expect(result.algorithmVersion).toBe(READING_SCORE_ALGORITHM_VERSION);
  });

  it("names the weakest component, because that is the one worth practising", () => {
    const sloppyRhythm = perfectRun(passage).map((answer, index) => ({
      ...answer,
      playedSeconds: (answer.playedSeconds as number) + (index % 2 === 0 ? 0.5 : -0.5),
    }));
    const result = scoreReadingAssessment({ passage, answers: sloppyRhythm });

    expect(result.components.noteAccuracy).toBe(1);
    expect(describeReadingScore(result)).toMatch(/rhythm/i);
  });

  it("says there is nothing to score when nothing was played", () => {
    const result = scoreReadingAssessment({ passage, answers: [] });

    expect(describeReadingScore(result)).toMatch(/nothing to score/i);
  });

  it("praises a run that is strong everywhere rather than inventing a weakness", () => {
    const result = scoreReadingAssessment({ passage, answers: perfectRun(passage) });

    expect(describeReadingScore(result)).toMatch(/strong across the board/i);
  });

  it("scores a single-note passage without dividing by a gap that does not exist", () => {
    const single = { ...passage, notes: passage.notes.slice(0, 1) };
    const result = scoreReadingAssessment({
      passage: single,
      answers: [
        { expectedMidi: single.notes[0]?.midi ?? 60, playedMidi: single.notes[0]?.midi ?? 60, playedSeconds: 0 },
      ],
    });

    expect(result.components.continuity).toBe(1);
    // One onset is not enough to judge pace, and pretending otherwise would be
    // a number with nothing behind it.
    expect(result.components.fluency).toBe(0);
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it("does not punish a passage played faster than written", () => {
    const answers = perfectRun(passage).map((answer) => ({
      ...answer,
      playedSeconds: (answer.playedSeconds as number) / 2,
    }));
    const result = scoreReadingAssessment({ passage: { ...passage, notes: passage.notes }, answers });

    expect(result.components.fluency).toBe(1);
  });

  it("treats notes played all at once as having no elapsed time rather than infinite pace", () => {
    const answers = perfectRun(passage).map((answer) => ({ ...answer, playedSeconds: 0 }));
    const result = scoreReadingAssessment({ passage, answers });

    expect(result.components.fluency).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it("ignores an onset that is not a real number", () => {
    const answers = perfectRun(passage).map((answer, index) =>
      index === 2 ? { ...answer, playedSeconds: Number.NaN } : answer,
    );
    const result = scoreReadingAssessment({ passage, answers });

    expect(Number.isNaN(result.components.rhythmAccuracy)).toBe(false);
    expect(result.notesPlayed).toBe(passage.notes.length);
  });
});
