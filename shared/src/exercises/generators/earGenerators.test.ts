import { describe, expect, it } from "vitest";
import { scaleMidi, SCALES } from "../../ear/theory";
import { EAR_GENERATORS, exerciseRegistry } from "../index";
import { normalizeExerciseDefinition } from "../exerciseDefinition";
import { validateExerciseDefinition } from "../validation";
import { earChoiceOptions } from "./earChoice";
import { MAX_SEQUENCE_LENGTH, MIN_SEQUENCE_LENGTH } from "./earPlayback";

const SEEDS = Array.from({ length: 40 }, (_, index) => `seed-${index}`);
const DIFFICULTIES = [0, 0.25, 0.5, 0.75, 1];

function generateAll(seed: string, difficulty = 0.5) {
  return EAR_GENERATORS.map((generator) => generator.generate({ seed, difficulty }));
}

describe("ear generators", () => {
  it("registers every family exactly once", () => {
    const kinds = EAR_GENERATORS.map((generator) => generator.kind);

    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) expect(exerciseRegistry.get(kind)).toBeDefined();
  });

  it("covers every family the slice promises", () => {
    expect(EAR_GENERATORS.map((generator) => generator.kind)).toEqual([
      "ear.interval",
      "ear.chord",
      "ear.scale",
      "ear.cadence",
      "ear.interval-play",
      "ear.sequence",
      "ear.key-centre",
      "ear.rhythm-echo",
      "ear.transcription",
    ]);
  });

  it("is deterministic in its seed, so an exercise can be reproduced", () => {
    for (const generator of EAR_GENERATORS) {
      const first = generator.generate({ seed: "repeat", difficulty: 0.5 });
      const second = generator.generate({ seed: "repeat", difficulty: 0.5 });
      expect(second).toEqual(first);
    }
  });

  it("produces different content for different seeds", () => {
    for (const generator of EAR_GENERATORS) {
      const ids = SEEDS.map((seed) => JSON.stringify(generator.generate({ seed, difficulty: 0.5 }).stimulus));
      // Not every seed need differ, but a generator that always returns the same
      // stimulus is not a generator.
      expect(new Set(ids).size).toBeGreaterThan(1);
    }
  });

  it("produces only valid, normalizable definitions at every difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 20)) {
        for (const definition of generateAll(seed, difficulty)) {
          expect(validateExerciseDefinition(definition)).toEqual([]);
          expect(normalizeExerciseDefinition(definition)).not.toBeNull();
        }
      }
    }
  });

  it("keeps every sounding pitch on the piano", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        for (const definition of generateAll(seed, difficulty)) {
          if (definition.stimulus.kind !== "audio-pitch") continue;
          for (const midi of definition.stimulus.midi) {
            expect(midi).toBeGreaterThanOrEqual(21);
            expect(midi).toBeLessThanOrEqual(108);
          }
        }
      }
    }
  });

  it("never calls a generated sequence a melody", () => {
    for (const seed of SEEDS) {
      for (const definition of generateAll(seed)) {
        // These are drawn from a scale, not composed. Calling them melodies
        // would train a learner to listen for a shape that is not there.
        expect(definition.title.toLowerCase()).not.toContain("melody");
        expect(definition.title.toLowerCase()).not.toContain("tune");
      }
    }
  });

  it("offers the correct answer among the options it presents", () => {
    for (const kind of ["ear.interval", "ear.chord", "ear.scale", "ear.cadence"]) {
      const options = earChoiceOptions(kind).map((option) => option.id);
      expect(options.length).toBeGreaterThan(1);

      for (const seed of SEEDS) {
        const definition = exerciseRegistry.generate(kind, { seed, difficulty: 0.5 });
        expect(definition?.expectedAnswer.kind).toBe("choice");
        if (definition?.expectedAnswer.kind === "choice") {
          expect(options).toContain(definition.expectedAnswer.optionId);
        }
      }
    }
  });

  it("has no options for a kind that is not answered by choosing", () => {
    expect(earChoiceOptions("ear.sequence")).toEqual([]);
  });
});

describe("ear.sequence", () => {
  it("stays within the length the curriculum asks for, and grows with difficulty", () => {
    const shortest = exerciseRegistry.generate("ear.sequence", { seed: "s", difficulty: 0 });
    const longest = exerciseRegistry.generate("ear.sequence", { seed: "s", difficulty: 1 });

    expect(shortest?.expectedAnswer).toMatchObject({ kind: "pitch-sequence" });
    if (shortest?.expectedAnswer.kind === "pitch-sequence" && longest?.expectedAnswer.kind === "pitch-sequence") {
      expect(shortest.expectedAnswer.midi).toHaveLength(MIN_SEQUENCE_LENGTH);
      expect(longest.expectedAnswer.midi).toHaveLength(MAX_SEQUENCE_LENGTH);
    }
  });

  it("draws from a scale and never repeats a note back to back", () => {
    for (const seed of SEEDS) {
      const definition = exerciseRegistry.generate("ear.sequence", { seed, difficulty: 0.8 });
      if (definition?.expectedAnswer.kind !== "pitch-sequence") throw new Error("expected a pitch sequence");
      const midi = definition.expectedAnswer.midi;

      // A repeat asks the learner to notice that nothing changed.
      for (let index = 1; index < midi.length; index += 1) expect(midi[index]).not.toBe(midi[index - 1]);

      const tonic = Math.min(...midi);
      const pool = new Set(scaleMidi(tonic, SCALES[0] as (typeof SCALES)[number]));
      // Every note belongs to some major scale rooted at or below the lowest.
      expect(midi.every((note) => pool.has(note) || note < tonic + 12)).toBe(true);
    }
  });

  it("plays back exactly what it asks for", () => {
    const definition = exerciseRegistry.generate("ear.sequence", { seed: "match", difficulty: 0.5 });

    if (definition?.stimulus.kind !== "audio-pitch") throw new Error("expected audio");
    if (definition.expectedAnswer.kind !== "pitch-sequence") throw new Error("expected a pitch sequence");
    expect(definition.stimulus.midi).toEqual(definition.expectedAnswer.midi);
  });
});

describe("ear.key-centre", () => {
  it("asks for the tonic without ever playing it", () => {
    for (const seed of SEEDS) {
      const definition = exerciseRegistry.generate("ear.key-centre", { seed });
      if (definition?.expectedAnswer.kind !== "pitch") throw new Error("expected a pitch answer");
      if (definition.stimulus.kind !== "audio-pitch") throw new Error("expected audio");

      // Playing the answer would make this a memory exercise.
      expect(definition.stimulus.midi).not.toContain(definition.expectedAnswer.midi);
    }
  });
});

describe("ear.rhythm-echo", () => {
  it("asks about time, not pitch", () => {
    const definition = exerciseRegistry.generate("ear.rhythm-echo", { seed: "r", difficulty: 0.5 });

    if (definition?.stimulus.kind !== "audio-pitch") throw new Error("expected audio");
    expect(new Set(definition.stimulus.midi).size).toBe(1);
    expect(definition.expectedAnswer.kind).toBe("rhythm");
  });

  it("produces onsets in order, on the tick grid", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 15)) {
        const definition = exerciseRegistry.generate("ear.rhythm-echo", { seed, difficulty });
        if (definition?.expectedAnswer.kind !== "rhythm") throw new Error("expected a rhythm answer");
        const ticks = definition.expectedAnswer.onsetTicks;

        expect(ticks.length).toBeGreaterThan(0);
        expect(ticks[0]).toBe(0);
        for (let index = 1; index < ticks.length; index += 1) {
          expect(Number.isInteger(ticks[index] as number)).toBe(true);
          expect(ticks[index] as number).toBeGreaterThan(ticks[index - 1] as number);
        }
      }
    }
  });
});

describe("ear.transcription", () => {
  it("asks for pitch and rhythm together", () => {
    const definition = exerciseRegistry.generate("ear.transcription", { seed: "t", difficulty: 0.6 });

    expect(definition?.expectedAnswer.kind).toBe("transcription");
    expect(definition?.scoringPolicy.components).toEqual(["pitch", "rhythm"]);
  });

  it("plays exactly the notes it expects to be written down", () => {
    for (const seed of SEEDS.slice(0, 15)) {
      const definition = exerciseRegistry.generate("ear.transcription", { seed, difficulty: 0.6 });
      if (definition?.expectedAnswer.kind !== "transcription") throw new Error("expected a transcription");
      if (definition.stimulus.kind !== "audio-pitch") throw new Error("expected audio");

      const notes = definition.expectedAnswer.notes;
      expect(definition.stimulus.midi).toEqual(notes.map((note) => note.midi));

      // Onsets ascend, so the written phrase reads left to right.
      for (let index = 1; index < notes.length; index += 1) {
        expect((notes[index] as { onsetTicks: number }).onsetTicks).toBeGreaterThan(
          (notes[index - 1] as { onsetTicks: number }).onsetTicks,
        );
      }
    }
  });
});
