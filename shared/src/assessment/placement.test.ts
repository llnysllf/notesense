import { describe, expect, it } from "vitest";
import { buildMasterySnapshot, type MasterySnapshot } from "../evidence/mastery";
import {
  answerPlacement,
  isPlacementComplete,
  placementOutcome,
  placementPrior,
  placementStartingPoint,
  shouldOfferPlacement,
  startPlacement,
  type PlacementState,
} from "./placement";

function run(answers: readonly boolean[]): PlacementState {
  return answers.reduce<PlacementState>((state, correct) => answerPlacement(state, correct), startPlacement());
}

const EMPTY_SNAPSHOT: MasterySnapshot = buildMasterySnapshot([], new Date("2026-08-01T00:00:00.000Z"));

describe("placement", () => {
  it("starts below the middle, so the first item is not discouraging", () => {
    const state = startPlacement();

    expect(state.difficulty).toBeLessThan(0.5);
    expect(isPlacementComplete(state)).toBe(false);
    expect(placementOutcome(state)).toBeUndefined();
  });

  it("moves up on a correct answer and down on a wrong one", () => {
    const start = startPlacement();

    expect(answerPlacement(start, true).difficulty).toBeGreaterThan(start.difficulty);
    expect(answerPlacement(start, false).difficulty).toBeLessThan(start.difficulty);
  });

  it("never moves further than one bounded step, however the answers fall", () => {
    let state = startPlacement();

    for (const correct of [true, true, false, true, false, false, true, true, false, true, true, false]) {
      const before = state.difficulty;
      state = answerPlacement(state, correct);
      expect(Math.abs(state.difficulty - before)).toBeLessThanOrEqual(0.25);
      expect(state.difficulty).toBeGreaterThanOrEqual(0);
      expect(state.difficulty).toBeLessThanOrEqual(1);
    }
  });

  it("narrows its steps as the answers turn around", () => {
    const settling = run([true, false, true, false, true]);

    expect(settling.reversals).toBeGreaterThanOrEqual(2);
    expect(settling.step).toBeLessThan(0.2);
  });

  it("stops once the answers have settled, without using every item", () => {
    const state = run([true, false, true, false, true]);

    expect(state.stopReason).toBe("confident");
    expect(state.answered).toBeLessThan(12);

    const outcome = placementOutcome(state);
    expect(outcome?.explanation).toMatch(/settled around this level/i);
    expect(outcome?.isProvisional).toBe(true);
  });

  it("is short even when the answers never settle", () => {
    const state = run(Array.from({ length: 30 }, (_, index) => index % 3 === 0));

    expect(state.answered).toBeLessThanOrEqual(12);
    expect(isPlacementComplete(state)).toBe(true);
  });

  it("stops at the floor rather than pretending to measure below it", () => {
    const state = run([false, false, false, false, false, false]);

    expect(state.stopReason).toBe("floor");
    const outcome = placementOutcome(state);
    expect(outcome?.difficulty).toBe(0);
    // The floor must not read as a verdict on the learner.
    expect(outcome?.explanation).toMatch(/normal place to start/i);
  });

  it("stops at the ceiling and says the harder material comes from practice", () => {
    const state = run([true, true, true, true, true, true, true]);

    expect(state.stopReason).toBe("ceiling");
    const outcome = placementOutcome(state);
    expect(outcome?.difficulty).toBe(1);
    expect(outcome?.explanation).toMatch(/harder material will come from practice/i);
  });

  it("never claims high confidence from a handful of items", () => {
    for (const answers of [
      [true, false, true, false, true],
      [false, false, false, false, false, false],
      [true, true, true, true, true, true, true],
    ]) {
      const outcome = placementOutcome(run(answers));
      expect(outcome?.confidence).toBeLessThanOrEqual(0.7);
      expect(outcome?.isProvisional).toBe(true);
    }
  });

  it("is a pure function of the answers, so a run can be replayed", () => {
    const answers = [true, false, true, true, false, true];

    expect(run(answers)).toEqual(run(answers));
  });

  it("ignores further answers once it has stopped", () => {
    const stopped = run([true, false, true, false, true]);

    expect(answerPlacement(stopped, false)).toBe(stopped);
  });

  it("turns an outcome into a starting point the learner can read", () => {
    const outcome = placementOutcome(run([true, false, true, false, true]));
    const start = placementStartingPoint(outcome as NonNullable<typeof outcome>);

    expect(start.lowMidi).toBeLessThan(start.highMidi);
    expect(start.summary).toMatch(/Starting at .+ difficulty/);
  });
});

describe("placement against real evidence", () => {
  const outcome = placementOutcome(run([true, false, true, false, true]));

  it("is offered while nothing has been measured", () => {
    expect(shouldOfferPlacement(EMPTY_SNAPSHOT)).toBe(true);
    expect(placementPrior(outcome, EMPTY_SNAPSHOT)).toBeDefined();
  });

  it("stops applying once practice has said more than the placement did", () => {
    const practised: MasterySnapshot = {
      ...EMPTY_SNAPSHOT,
      competencies: {
        "reading.pitch.staff-to-key": {
          competencyId: "reading.pitch.staff-to-key",
          attempts: 40,
          accuracy: 0.8,
          fluency: 0.7,
          confidence: 0.6,
          inferredAttempts: 0,
        },
      },
    };

    // The exit gate: a placement guess must never overwrite real evidence.
    expect(shouldOfferPlacement(practised)).toBe(false);
    expect(placementPrior(outcome, practised)).toBeUndefined();
  });

  it("does not treat imported legacy summaries as measured evidence", () => {
    const inferredOnly: MasterySnapshot = {
      ...EMPTY_SNAPSHOT,
      competencies: {
        "reading.pitch.staff-to-key": {
          competencyId: "reading.pitch.staff-to-key",
          attempts: 40,
          accuracy: 0.8,
          fluency: 0,
          confidence: 0.6,
          inferredAttempts: 40,
        },
      },
    };

    expect(shouldOfferPlacement(inferredOnly)).toBe(true);
  });

  it("has nothing to apply when placement was skipped", () => {
    expect(placementPrior(undefined, EMPTY_SNAPSHOT)).toBeUndefined();
  });
});
