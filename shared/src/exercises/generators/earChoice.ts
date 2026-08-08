// The ear families answered by choosing a name: interval, chord quality, scale
// or mode, and cadence.
//
// All four have the same shape — play something, offer the vocabulary, ask which
// it was — so they are built from one factory rather than four near-copies that
// would drift. The options come from the same theory table the stimulus is built
// from, which is what stops a generator marking its own correct answer wrong.

import { type CompetencyId } from "../../curriculum/competencies";
import { clampDifficulty } from "../../curriculum/difficulty";
import { cadenceMidi, chordMidi, scaleMidi, CADENCES, CHORD_QUALITIES, INTERVALS, SCALES } from "../../ear/theory";
import { type ExerciseDefinition } from "../exerciseDefinition";
import { type ExerciseGenerator, type GeneratorOptions } from "../generator";
import { createRng, randInt } from "../seededRng";

const GENERATOR_VERSION = 1;
// A central range, so nothing is asked at the edge of hearing or of the keyboard.
const LOW_ROOT = 55;
const HIGH_ROOT = 67;

// Which answers a learner is offered. Everything in the family: hiding the
// harder options would inflate the score without teaching anything, and the
// learner would notice.
export type EarChoiceOption = { id: string; label: string };

function definition(options: {
  kind: string;
  seed: string;
  title: string;
  competencyId: CompetencyId;
  midi: number[];
  playback: "single" | "block" | "arpeggio";
  optionId: string;
  difficulty: number;
  estimatedSeconds: number;
  groupSize?: number;
}): ExerciseDefinition {
  return {
    schemaVersion: 1,
    id: `${options.kind}-${options.seed}`,
    version: 1,
    generatorVersion: GENERATOR_VERSION,
    curriculumVersion: 1,
    skillMappingVersion: 1,
    kind: options.kind,
    title: options.title,
    competencyIds: [options.competencyId],
    dimensions: { soundingRange: `${LOW_ROOT}-${HIGH_ROOT + 24}`, inputMode: "touch" },
    difficulty: clampDifficulty(options.difficulty),
    estimatedSeconds: options.estimatedSeconds,
    stimulus: {
      kind: "audio-pitch",
      midi: options.midi,
      playback: options.playback,
      ...(options.groupSize === undefined ? {} : { groupSize: options.groupSize }),
    },
    expectedAnswer: { kind: "choice", optionId: options.optionId },
    // A named answer is a button, so it works by touch or keyboard; no
    // instrument is needed to say "that was a minor third".
    inputModes: ["touch", "computer-keyboard"],
    scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
    contentSource: "generated",
    seed: options.seed,
  };
}

export const EAR_INTERVAL_OPTIONS: readonly EarChoiceOption[] = INTERVALS.map((interval) => ({
  id: interval.id,
  label: interval.label,
}));

export const EAR_CHORD_OPTIONS: readonly EarChoiceOption[] = CHORD_QUALITIES.map((quality) => ({
  id: quality.id,
  label: quality.label,
}));

export const EAR_SCALE_OPTIONS: readonly EarChoiceOption[] = SCALES.map((scale) => ({
  id: scale.id,
  label: scale.label,
}));

export const EAR_CADENCE_OPTIONS: readonly EarChoiceOption[] = CADENCES.map((cadence) => ({
  id: cadence.id,
  label: cadence.label,
}));

// Which options an exercise kind offers, so a screen can render answers without
// knowing how the stimulus was built.
export function earChoiceOptions(kind: string): readonly EarChoiceOption[] {
  if (kind === "ear.interval") return EAR_INTERVAL_OPTIONS;
  if (kind === "ear.chord") return EAR_CHORD_OPTIONS;
  if (kind === "ear.scale") return EAR_SCALE_OPTIONS;
  if (kind === "ear.cadence") return EAR_CADENCE_OPTIONS;
  return [];
}

export const earIntervalGenerator: ExerciseGenerator = {
  kind: "ear.interval",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.interval:${seed}`);
    const root = randInt(rng, LOW_ROOT, HIGH_ROOT);
    const interval = INTERVALS[randInt(rng, 0, INTERVALS.length - 1)] as (typeof INTERVALS)[number];

    return definition({
      kind: "ear.interval",
      seed,
      title: "Which interval was that?",
      competencyId: "ear.interval.melodic",
      midi: [root, root + interval.semitones],
      // Melodic, not harmonic: hearing the distance between two notes played in
      // turn is the skill this competency names.
      playback: "arpeggio",
      optionId: interval.id,
      // Small steps and the perfect intervals are the easy end.
      difficulty: interval.semitones === 0 || interval.semitones === 12 ? 0.1 : interval.semitones / 16,
      estimatedSeconds: 10,
    });
  },
};

export const earChordGenerator: ExerciseGenerator = {
  kind: "ear.chord",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.chord:${seed}`);
    const root = randInt(rng, LOW_ROOT, HIGH_ROOT);
    const quality = CHORD_QUALITIES[randInt(rng, 0, CHORD_QUALITIES.length - 1)] as (typeof CHORD_QUALITIES)[number];

    return definition({
      kind: "ear.chord",
      seed,
      title: "What kind of chord was that?",
      competencyId: "ear.chord.quality",
      midi: chordMidi(root, quality),
      playback: "block",
      optionId: quality.id,
      // Triads before sevenths.
      difficulty: quality.semitones.length > 3 ? 0.7 : 0.4,
      estimatedSeconds: 10,
    });
  },
};

export const earScaleGenerator: ExerciseGenerator = {
  kind: "ear.scale",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.scale:${seed}`);
    const tonic = randInt(rng, LOW_ROOT, HIGH_ROOT);
    const scale = SCALES[randInt(rng, 0, SCALES.length - 1)] as (typeof SCALES)[number];

    return definition({
      kind: "ear.scale",
      seed,
      title: "Which scale was that?",
      competencyId: "ear.scale.mode",
      midi: scaleMidi(tonic, scale),
      playback: "arpeggio",
      optionId: scale.id,
      // Major and natural minor are the reference points; the modes are harder.
      difficulty: scale.id === "major" || scale.id === "natural-minor" ? 0.35 : 0.65,
      estimatedSeconds: 14,
    });
  },
};

export const earCadenceGenerator: ExerciseGenerator = {
  kind: "ear.cadence",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.cadence:${seed}`);
    const tonic = randInt(rng, LOW_ROOT, HIGH_ROOT);
    const cadence = CADENCES[randInt(rng, 0, CADENCES.length - 1)] as (typeof CADENCES)[number];

    return definition({
      kind: "ear.cadence",
      seed,
      title: "How did that phrase end?",
      competencyId: "ear.cadence",
      // Both chords, in order, played as two blocks rather than one pile.
      midi: cadenceMidi(tonic, cadence).flat(),
      playback: "block",
      groupSize: (cadenceMidi(tonic, cadence)[0] as number[]).length,
      optionId: cadence.id,
      difficulty: cadence.id === "authentic" ? 0.4 : 0.7,
      estimatedSeconds: 12,
    });
  },
};
