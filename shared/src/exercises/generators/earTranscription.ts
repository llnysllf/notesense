// The two families answered by writing something down: a rhythm echo, and a
// full pitch-and-rhythm transcription.
//
// Both are built on the rhythm engine rather than on a private notion of
// duration, so "a dotted quarter" means the same thing here as it does in a
// rhythm drill or on a printed staff.

import { clampDifficulty } from "../../curriculum/difficulty";
import { scaleMidi, SCALES } from "../../ear/theory";
import { rationalToTicks, TRANSPORT_V1 } from "../../music/time";
import { generateRhythmPattern, type RhythmVocabulary } from "../../rhythm/pattern";
import { type NotatedNote } from "../answer";
import { type ExerciseDefinition } from "../exerciseDefinition";
import { type ExerciseGenerator, type GeneratorOptions } from "../generator";
import { createRng, randInt } from "../seededRng";

const GENERATOR_VERSION = 1;
const METER = { beats: 4, beatUnit: 4 } as const;
const LOW_TONIC = 57;
const HIGH_TONIC = 67;

function vocabularyFor(difficulty: number): RhythmVocabulary {
  if (difficulty < 0.35) return "simple";
  if (difficulty < 0.65) return "eighths";
  return "dotted";
}

// The onsets of a generated pattern, as integer ticks.
function patternOnsets(seed: string, bars: number, vocabulary: RhythmVocabulary): number[] {
  const pattern = generateRhythmPattern({ meter: METER, bars, vocabulary, seed });
  return pattern.events.flatMap((event) => {
    if (event.isRest) return [];
    const ticks = rationalToTicks(event.offset, TRANSPORT_V1);
    return ticks === undefined ? [] : [ticks];
  });
}

export const earRhythmEchoGenerator: ExerciseGenerator = {
  kind: "ear.rhythm-echo",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed, difficulty = 0.3 }: GeneratorOptions): ExerciseDefinition {
    const bars = difficulty < 0.5 ? 1 : 2;
    const onsetTicks = patternOnsets(`ear.rhythm-echo:${seed}`, bars, vocabularyFor(difficulty));

    return {
      schemaVersion: 1,
      id: `ear.rhythm-echo-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "ear.rhythm-echo",
      title: `Tap back the rhythm (${bars === 1 ? "1 bar" : `${bars} bars`})`,
      competencyIds: ["ear.rhythm.echo"],
      dimensions: { meter: "4/4", rhythmVocabulary: vocabularyFor(difficulty), inputMode: "touch" },
      difficulty: clampDifficulty(difficulty),
      estimatedSeconds: 10 + bars * 6,
      // One pitch throughout: this asks about time, and varying the pitch would
      // quietly make it a different exercise.
      stimulus: { kind: "audio-pitch", midi: onsetTicks.map(() => 72), playback: "arpeggio" },
      expectedAnswer: { kind: "rhythm", onsetTicks, transport: TRANSPORT_V1 },
      inputModes: ["touch", "midi"],
      scoringPolicy: { components: ["rhythm"], passThreshold: 0.7 },
      contentSource: "generated",
      seed,
    };
  },
};

export const earTranscriptionGenerator: ExerciseGenerator = {
  kind: "ear.transcription",
  generatorVersion: GENERATOR_VERSION,
  generate({ seed, difficulty = 0.4 }: GeneratorOptions): ExerciseDefinition {
    const rng = createRng(`ear.transcription:${seed}`);
    const tonic = randInt(rng, LOW_TONIC, HIGH_TONIC);
    const pool = scaleMidi(tonic, SCALES[0] as (typeof SCALES)[number]);
    const bars = difficulty < 0.5 ? 1 : 2;
    const onsetTicks = patternOnsets(`ear.transcription:${seed}`, bars, vocabularyFor(difficulty));

    const notes: NotatedNote[] = [];
    let previous: number | undefined;
    for (const ticks of onsetTicks) {
      let midi = pool[randInt(rng, 0, pool.length - 1)] as number;
      if (midi === previous) midi = pool[(pool.indexOf(midi) + 1) % pool.length] as number;
      notes.push({ midi, onsetTicks: ticks });
      previous = midi;
    }

    return {
      schemaVersion: 1,
      id: `ear.transcription-${seed}`,
      version: 1,
      generatorVersion: GENERATOR_VERSION,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      kind: "ear.transcription",
      title: `Write down what you hear (${notes.length} notes)`,
      competencyIds: ["ear.sequence.transcription"],
      dimensions: {
        soundingRange: `${tonic}-${tonic + 12}`,
        meter: "4/4",
        sequenceLength: notes.length,
        inputMode: "touch",
      },
      difficulty: clampDifficulty(difficulty),
      estimatedSeconds: 30 + notes.length * 4,
      stimulus: { kind: "audio-pitch", midi: notes.map((note) => note.midi), playback: "arpeggio" },
      expectedAnswer: { kind: "transcription", notes, transport: TRANSPORT_V1 },
      inputModes: ["touch", "midi"],
      scoringPolicy: { components: ["pitch", "rhythm"], passThreshold: 0.7 },
      contentSource: "generated",
      seed,
    };
  },
};
