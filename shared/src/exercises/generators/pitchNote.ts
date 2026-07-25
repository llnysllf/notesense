// Ear pitch anchor: a single pitch is played and the learner reproduces it on
// the keyboard. Deterministic in its seed.

import { clampDifficulty } from "../../curriculum/difficulty";
import { midiToNoteId } from "../../music/pitch";
import { type ExerciseDefinition } from "../exerciseDefinition";
import { type ExerciseGenerator, type GeneratorOptions } from "../generator";
import { createRng, randInt } from "../seededRng";

const GENERATOR_VERSION = 1;
// A central, singable range (C3..C5); difficulty grows toward the edges.
const LOW = 48;
const HIGH = 72;
const CENTRE = 60;

export const pitchNoteGenerator: ExerciseGenerator = {
  kind: "ear.pitch",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.pitch:${seed}`);
    const midi = randInt(rng, LOW, HIGH);
    const difficulty = clampDifficulty(Math.abs(midi - CENTRE) / 24);
    const noteId = midiToNoteId(midi);

    return {
      schemaVersion: 1,
      id: `ear.pitch-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "ear.pitch",
      title: `Hear and play the pitch (${noteId})`,
      competencyIds: ["ear.pitch.absolute-anchor"],
      dimensions: { soundingRange: `${LOW}-${HIGH}`, inputMode: "touch" },
      difficulty,
      estimatedSeconds: 8,
      stimulus: { kind: "audio-pitch", midi: [midi], playback: "single" },
      expectedAnswer: { kind: "pitch", midi },
      inputModes: ["touch", "midi"],
      scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
      contentSource: "generated",
      seed,
    };
  },
};
