// What a learner is asked to sing, in the order the roadmap puts it.
//
// The progression is deliberately slow at the start. Matching one pitch is not
// a warm-up for singing — for a lot of adults it is the whole difficulty, and
// an app that opens with a five-note phrase tells them immediately that this is
// not for them.
//
// Every stage is generated against the learner's own range, so nothing is ever
// written where they cannot sing it.

import { createRng, randInt } from "../exercises/seededRng";
import { fitToRange, type VocalRange } from "./vocalRange";
import { type SungTarget } from "./sungScore";

export type SingingStageId = "match-one" | "two-notes" | "short-phrase" | "rhythm-on-one" | "sight-sing";

export type SingingStage = {
  id: SingingStageId;
  label: string;
  summary: string;
  // How many notes the stage asks for, and how long each is held.
  noteCount: number;
  noteSeconds: number;
  // Whether the notes are notated for the learner to read, or played to copy.
  reading: boolean;
};

export const SINGING_STAGES: readonly SingingStage[] = [
  {
    id: "match-one",
    label: "Match one note",
    summary: "Hear a note, then sing it back.",
    noteCount: 1,
    noteSeconds: 2,
    reading: false,
  },
  {
    id: "two-notes",
    label: "Two notes",
    summary: "Hear two notes, then sing them back.",
    noteCount: 2,
    noteSeconds: 1.5,
    reading: false,
  },
  {
    id: "short-phrase",
    label: "Short phrase",
    summary: "Sing back a phrase of three to five notes.",
    noteCount: 4,
    noteSeconds: 1,
    reading: false,
  },
  {
    id: "rhythm-on-one",
    label: "Rhythm on one note",
    summary: "Sing a written rhythm on a single pitch.",
    noteCount: 4,
    noteSeconds: 0.75,
    reading: true,
  },
  {
    id: "sight-sing",
    label: "Sight-sing",
    summary: "Sing a short written phrase you have not heard.",
    noteCount: 4,
    noteSeconds: 1,
    reading: true,
  },
];

export function singingStage(id: SingingStageId): SingingStage {
  return SINGING_STAGES.find((stage) => stage.id === id) ?? (SINGING_STAGES[0] as SingingStage);
}

// Steps a phrase can move by. Kept small and mostly stepwise: a singer finds a
// second by ear far more reliably than a seventh, and the exercise is about
// pitching accurately rather than about reading leaps.
const STEPS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 7];

export type SingingExercise = {
  stageId: SingingStageId;
  seed: string;
  // The note to sound before the learner starts. Giving the starting pitch is
  // the one piece of help that does not do the exercise for them.
  referenceMidi: number;
  targets: SungTarget[];
  reading: boolean;
};

export type BuildSingingExerciseOptions = {
  stageId: SingingStageId;
  range: VocalRange;
  seed: string;
};

// Builds one exercise, in the learner's range. Deterministic in its seed.
export function buildSingingExercise({ stageId, range, seed }: BuildSingingExerciseOptions): SingingExercise {
  const stage = singingStage(stageId);
  const rng = createRng(`singing:${stageId}:${seed}`);

  const centre = Math.round((range.lowMidi + range.highMidi) / 2);
  const midis: number[] = [centre];

  for (let index = 1; index < stage.noteCount; index += 1) {
    const previous = midis[index - 1] as number;
    // A rhythm exercise stays on one pitch: it is asking about time, and moving
    // the pitch would quietly make it a different exercise.
    if (stageId === "rhythm-on-one") {
      midis.push(previous);
      continue;
    }
    const step = STEPS[randInt(rng, 0, STEPS.length - 1)] as number;
    const next = previous + step;
    // Stay inside the range rather than walking out of it and being folded back
    // later, which would break the shape the learner is asked to sing.
    midis.push(next < range.lowMidi || next > range.highMidi ? previous - step : next);
  }

  const fitted = fitToRange(midis, range);
  let onset = 0;
  const targets: SungTarget[] = fitted.map((midi) => {
    const target: SungTarget = { midi, onsetSeconds: onset, durationSeconds: stage.noteSeconds };
    onset += stage.noteSeconds;
    return target;
  });

  return {
    stageId,
    seed,
    referenceMidi: (fitted[0] as number) ?? centre,
    targets,
    reading: stage.reading,
  };
}

// How long the learner has to sing, plus a little tail so a final note that
// runs slightly long is still part of the performance.
export const TAIL_SECONDS = 0.75;

export function exerciseSeconds(exercise: SingingExercise): number {
  const last = exercise.targets[exercise.targets.length - 1];
  return last ? last.onsetSeconds + last.durationSeconds + TAIL_SECONDS : 0;
}
