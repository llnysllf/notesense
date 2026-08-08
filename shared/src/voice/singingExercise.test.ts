import { describe, expect, it } from "vitest";
import { buildSingingExercise, exerciseSeconds, singingStage, SINGING_STAGES } from "./singingExercise";
import { VOCAL_RANGE_VERSION, type VocalRange } from "./vocalRange";

const BARITONE: VocalRange = { version: VOCAL_RANGE_VERSION, lowMidi: 48, highMidi: 64 };
const SOPRANO: VocalRange = { version: VOCAL_RANGE_VERSION, lowMidi: 60, highMidi: 79 };
const SEEDS = Array.from({ length: 30 }, (_, index) => `seed-${index}`);

describe("singing progression", () => {
  it("starts with matching a single note", () => {
    // For a lot of adults this is not a warm-up, it is the whole difficulty.
    expect(SINGING_STAGES[0]?.id).toBe("match-one");
    expect(SINGING_STAGES[0]?.noteCount).toBe(1);
  });

  it("covers the progression the roadmap asks for", () => {
    expect(SINGING_STAGES.map((stage) => stage.id)).toEqual([
      "match-one",
      "two-notes",
      "short-phrase",
      "rhythm-on-one",
      "sight-sing",
    ]);
  });

  it("falls back to the first stage rather than throwing on an unknown one", () => {
    expect(singingStage("nope" as never).id).toBe("match-one");
  });

  it("is deterministic in its seed", () => {
    const first = buildSingingExercise({ stageId: "short-phrase", range: BARITONE, seed: "x" });
    const second = buildSingingExercise({ stageId: "short-phrase", range: BARITONE, seed: "x" });

    expect(second).toEqual(first);
  });

  it("never writes a note outside the learner's range", () => {
    for (const range of [BARITONE, SOPRANO]) {
      for (const stage of SINGING_STAGES) {
        for (const seed of SEEDS) {
          const exercise = buildSingingExercise({ stageId: stage.id, range, seed });
          for (const target of exercise.targets) {
            expect(target.midi).toBeGreaterThanOrEqual(range.lowMidi);
            expect(target.midi).toBeLessThanOrEqual(range.highMidi);
          }
        }
      }
    }
  });

  it("asks for the number of notes the stage promises", () => {
    for (const stage of SINGING_STAGES) {
      const exercise = buildSingingExercise({ stageId: stage.id, range: BARITONE, seed: "s" });
      expect(exercise.targets).toHaveLength(stage.noteCount);
    }
  });

  it("keeps a rhythm exercise on one pitch, because it asks about time", () => {
    for (const seed of SEEDS) {
      const exercise = buildSingingExercise({ stageId: "rhythm-on-one", range: BARITONE, seed });
      expect(new Set(exercise.targets.map((target) => target.midi)).size).toBe(1);
    }
  });

  it("gives the starting note as a reference", () => {
    const exercise = buildSingingExercise({ stageId: "short-phrase", range: BARITONE, seed: "s" });

    expect(exercise.referenceMidi).toBe(exercise.targets[0]?.midi);
  });

  it("lays the notes out end to end, in order", () => {
    const exercise = buildSingingExercise({ stageId: "short-phrase", range: BARITONE, seed: "s" });

    for (let index = 1; index < exercise.targets.length; index += 1) {
      const previous = exercise.targets[index - 1] as (typeof exercise.targets)[number];
      expect(exercise.targets[index]?.onsetSeconds).toBeCloseTo(previous.onsetSeconds + previous.durationSeconds, 5);
    }
  });

  it("allows a tail so a final note that runs long still counts", () => {
    const exercise = buildSingingExercise({ stageId: "match-one", range: BARITONE, seed: "s" });
    const last = exercise.targets[0] as (typeof exercise.targets)[number];

    expect(exerciseSeconds(exercise)).toBeGreaterThan(last.onsetSeconds + last.durationSeconds);
  });

  it("marks which stages are read rather than copied", () => {
    expect(buildSingingExercise({ stageId: "match-one", range: BARITONE, seed: "s" }).reading).toBe(false);
    expect(buildSingingExercise({ stageId: "sight-sing", range: BARITONE, seed: "s" }).reading).toBe(true);
  });
});
