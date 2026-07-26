// Staff-to-key reading: a single notated pitch the learner plays on the
// keyboard. Deterministic in its seed; difficulty grows with distance from the
// staff centre (more ledger lines).

import { clampDifficulty } from "../../curriculum/difficulty";
import { midiToNoteId } from "../../music/pitch";
import { type ExerciseDefinition } from "../exerciseDefinition";
import { type ExerciseGenerator, type GeneratorOptions } from "../generator";
import { createRng, pick, randInt } from "../seededRng";

const GENERATOR_VERSION = 1;

// Comfortable single-line ranges (inclusive MIDI) and the staff centre used to
// gauge difficulty.
const CLEFS = {
  treble: { low: 60, high: 81, centre: 71 }, // C4..A5, centre B4
  bass: { low: 36, high: 57, centre: 47 }, // C2..A3, centre B3
} as const;

type ClefName = keyof typeof CLEFS;

export const readingNoteGenerator: ExerciseGenerator = {
  kind: "reading.staff-to-key",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`reading.staff-to-key:${seed}`);
    const clef = pick<ClefName>(rng, ["treble", "bass"]);
    const range = CLEFS[clef];
    const midi = randInt(rng, range.low, range.high);
    const distance = Math.abs(midi - range.centre);
    const difficulty = clampDifficulty(distance / 24);
    const noteId = midiToNoteId(midi);

    return {
      schemaVersion: 1,
      id: `reading.staff-to-key-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "reading.staff-to-key",
      title: `Read and play ${noteId}`,
      competencyIds: ["reading.pitch.staff-to-key"],
      dimensions: { clef, writtenRange: `${range.low}-${range.high}`, inputMode: "touch" },
      difficulty,
      estimatedSeconds: 6,
      stimulus: { kind: "prompt-note", midi },
      expectedAnswer: { kind: "pitch", midi },
      inputModes: ["touch", "computer-keyboard", "midi"],
      scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
      contentSource: "generated",
      seed,
    };
  },
};
