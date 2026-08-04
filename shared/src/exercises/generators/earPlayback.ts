// The ear families answered by playing back what you heard: a pitch sequence,
// an interval reproduced on the keyboard, and finding the key centre.
//
// These need an instrument — real or on screen — because naming a sound and
// producing it are different skills, and the roadmap asks for both.
//
// The UI wording matters here. These sequences are generated from a scale, not
// composed, so they are called "note sequences" rather than melodies. Calling
// random material a melody trains a learner to listen for a shape that is not
// there.

import { clampDifficulty } from "../../curriculum/difficulty";
import { scaleMidi, INTERVALS, SCALES } from "../../ear/theory";
import { type ExerciseDefinition } from "../exerciseDefinition";
import { type ExerciseGenerator, type GeneratorOptions } from "../generator";
import { createRng, randInt } from "../seededRng";

const GENERATOR_VERSION = 1;
const LOW_ROOT = 55;
const HIGH_ROOT = 67;

// The roadmap's range for an ordered sequence. Three is the shortest that has an
// order at all; beyond sixteen this stops measuring hearing and starts measuring
// working memory.
export const MIN_SEQUENCE_LENGTH = 3;
export const MAX_SEQUENCE_LENGTH = 16;

function sequenceLengthFor(difficulty: number): number {
  const span = MAX_SEQUENCE_LENGTH - MIN_SEQUENCE_LENGTH;
  return MIN_SEQUENCE_LENGTH + Math.round(clampDifficulty(difficulty) * span);
}

export const earSequenceGenerator: ExerciseGenerator = {
  kind: "ear.sequence",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed, difficulty = 0.3 }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.sequence:${seed}`);
    const tonic = randInt(rng, LOW_ROOT, HIGH_ROOT);
    // Drawn from a scale rather than from chromatic noise: a sequence a learner
    // could not sing back is not testing whether they can hear it.
    const scale = SCALES[0] as (typeof SCALES)[number];
    const pool = scaleMidi(tonic, scale);
    const length = sequenceLengthFor(difficulty);

    const midi: number[] = [];
    let previous: number | undefined;
    for (let index = 0; index < length; index += 1) {
      let next = pool[randInt(rng, 0, pool.length - 1)] as number;
      // A repeat asks the learner to notice nothing changed, which is a
      // different and much easier question.
      if (next === previous) next = pool[(pool.indexOf(next) + 1) % pool.length] as number;
      midi.push(next);
      previous = next;
    }

    return {
      schemaVersion: 1,
      id: `ear.sequence-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "ear.sequence",
      title: `Play back the note sequence (${length} notes)`,
      competencyIds: ["ear.sequence.transcription"],
      dimensions: { soundingRange: `${tonic}-${tonic + 12}`, sequenceLength: length, inputMode: "touch" },
      difficulty: clampDifficulty(difficulty),
      estimatedSeconds: 8 + length * 2,
      stimulus: { kind: "audio-pitch", midi, playback: "arpeggio" },
      expectedAnswer: { kind: "pitch-sequence", midi },
      inputModes: ["touch", "midi"],
      scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
      contentSource: "generated",
      seed,
    };
  },
};

export const earIntervalPlayGenerator: ExerciseGenerator = {
  kind: "ear.interval-play",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.interval-play:${seed}`);
    const root = randInt(rng, LOW_ROOT, HIGH_ROOT);
    const interval = INTERVALS[randInt(rng, 0, INTERVALS.length - 1)] as (typeof INTERVALS)[number];
    const midi = [root, root + interval.semitones];

    return {
      schemaVersion: 1,
      id: `ear.interval-play-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "ear.interval-play",
      title: "Play back the two notes",
      competencyIds: ["ear.interval.melodic"],
      dimensions: { soundingRange: `${LOW_ROOT}-${HIGH_ROOT + 12}`, inputMode: "touch" },
      difficulty: clampDifficulty(interval.semitones / 16),
      estimatedSeconds: 12,
      stimulus: { kind: "audio-pitch", midi, playback: "arpeggio" },
      expectedAnswer: { kind: "pitch-sequence", midi },
      inputModes: ["touch", "midi"],
      scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
      contentSource: "generated",
      seed,
    };
  },
};

export const earKeyCentreGenerator: ExerciseGenerator = {
  kind: "ear.key-centre",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.key-centre:${seed}`);
    const tonic = randInt(rng, LOW_ROOT, HIGH_ROOT);
    const scale = SCALES[randInt(rng, 0, 1)] as (typeof SCALES)[number];
    const pool = scaleMidi(tonic, scale);

    // A short phrase that establishes the key without ever landing on the
    // tonic — finding it is the exercise, so handing it over would be giving
    // away the answer.
    const phrase = [pool[2], pool[4], pool[1], pool[4], pool[6], pool[4]].filter(
      (value): value is number => value !== undefined,
    );

    return {
      schemaVersion: 1,
      id: `ear.key-centre-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "ear.key-centre",
      title: "Which note does this want to end on?",
      competencyIds: ["ear.key.centre"],
      dimensions: { soundingRange: `${tonic}-${tonic + 12}`, key: `${tonic}:${scale.id}`, inputMode: "touch" },
      difficulty: scale.id === "major" ? 0.45 : 0.6,
      estimatedSeconds: 14,
      stimulus: { kind: "audio-pitch", midi: phrase, playback: "arpeggio" },
      expectedAnswer: { kind: "pitch", midi: tonic },
      inputModes: ["touch", "midi"],
      scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
      contentSource: "generated",
      seed,
    };
  },
};
