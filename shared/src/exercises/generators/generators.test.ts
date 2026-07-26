import { describe, expect, it } from "vitest";
import { normalizeExerciseDefinition } from "../exerciseDefinition";
import { validateExerciseDefinition } from "../validation";
import { readingNoteGenerator } from "./readingNote";
import { pitchNoteGenerator } from "./pitchNote";

describe("built-in generators", () => {
  it("are deterministic in their seed", () => {
    expect(readingNoteGenerator.generate({ seed: "abc" })).toEqual(readingNoteGenerator.generate({ seed: "abc" }));
    expect(pitchNoteGenerator.generate({ seed: "abc" })).toEqual(pitchNoteGenerator.generate({ seed: "abc" }));
    expect(readingNoteGenerator.generate({ seed: "abc" })).not.toEqual(readingNoteGenerator.generate({ seed: "xyz" }));
  });

  // High-volume invariant check: every generated item, across a wide seed space,
  // must be valid, normalizable, and internally consistent.
  it("produce valid, answerable exercises across 10,000 seeds", () => {
    for (let i = 0; i < 10_000; i += 1) {
      const seed = `seed-${i}`;
      for (const generator of [readingNoteGenerator, pitchNoteGenerator]) {
        const def = generator.generate({ seed });
        expect(validateExerciseDefinition(def), `${generator.kind}:${seed}`).toEqual([]);
        expect(normalizeExerciseDefinition(def), `${generator.kind}:${seed}`).not.toBeNull();
        expect(def.difficulty).toBeGreaterThanOrEqual(0);
        expect(def.difficulty).toBeLessThanOrEqual(1);
        if (def.expectedAnswer.kind === "pitch") {
          expect(def.expectedAnswer.midi).toBeGreaterThanOrEqual(21);
          expect(def.expectedAnswer.midi).toBeLessThanOrEqual(108);
        }
      }
    }
  });
});
