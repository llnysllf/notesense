// Turning one sitting into a Reading Score.
//
// The components stay visible and are never collapsed into a single opaque
// number: "62" tells a learner nothing, but "you read the notes well and kept
// going, and the rhythm slipped" tells them what to practise tomorrow. The
// overall figure exists so a learner can see movement over time, not so it can
// stand alone.
//
// This algorithm is NOT calibrated against any external standard, and says so.
// Everything it produces is labelled provisional until a calibration study
// exists, and a score is only ever compared to the same learner's own earlier
// score on an equivalent form.

import { ticksToSeconds } from "../music/compileTimeline";
import { gradeRhythm, toleranceForTempo } from "../rhythm/grade";
import { type AssessmentPassage } from "./passage";

export const READING_SCORE_ALGORITHM_VERSION = 1;

// Flipped only by a calibration study, never by a release that merely changes
// the weights. Until then every surface must say "provisional".
export const READING_SCORE_CALIBRATED = false;

export type ReadingScoreComponents = {
  // 0..1 each, reported separately on purpose.
  noteAccuracy: number;
  rhythmAccuracy: number;
  continuity: number;
  fluency: number;
};

export type ReadingScoreResult = {
  algorithmVersion: number;
  // 0..100, rounded. Meaningful only next to its difficulty band.
  score: number;
  components: ReadingScoreComponents;
  difficulty: number;
  notesExpected: number;
  notesPlayed: number;
  // 0..1 — how much of the passage the result actually rests on. A run
  // abandoned after three notes produces a number, but not a trustworthy one.
  confidence: number;
  isProvisional: boolean;
};

export type AssessmentAnswer = {
  expectedMidi: number;
  // Absent when the note was never played.
  playedMidi?: number;
  // Audio-clock seconds, on the same timebase the rhythm engine grades in.
  playedSeconds?: number;
};

export type ReadingAssessmentRun = {
  passage: AssessmentPassage;
  answers: readonly AssessmentAnswer[];
  // Measured device delay, subtracted from played onsets before grading.
  latencyMs?: number;
};

// Weights are a product judgement, not a measurement: reading the right notes
// matters most, and how far the learner got matters more than raw speed.
const WEIGHTS: ReadingScoreComponents = {
  noteAccuracy: 0.4,
  rhythmAccuracy: 0.25,
  continuity: 0.2,
  fluency: 0.15,
};

// Below this share of the passage, the result is shown but not trended.
export const MIN_CONFIDENT_COVERAGE = 0.6;

const EMPTY_COMPONENTS: ReadingScoreComponents = {
  noteAccuracy: 0,
  rhythmAccuracy: 0,
  continuity: 0,
  fluency: 0,
};

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

// Played onsets kept in their notated position, so a skipped note leaves a hole
// rather than shifting everything after it. Comparing the fifth thing played to
// the fifth thing written is only valid when nothing was dropped.
type AlignedOnsets = { played: (number | undefined)[]; expected: number[] };

function attemptedIndices({ played }: AlignedOnsets): number[] {
  return played.flatMap((seconds, index) => (seconds === undefined ? [] : [index]));
}

// How much of the passage was played without stopping. A gap far longer than
// the notated one is a stall, which is a different failure from playing the
// wrong notes and is what stops a learner performing for anyone.
function continuityScore(onsets: AlignedOnsets): number {
  const attempted = attemptedIndices(onsets);
  if (onsets.expected.length < 2) return attempted.length > 0 ? 1 : 0;
  if (attempted.length < 2) return 0;

  const reached = clampUnit(attempted.length / onsets.expected.length);
  let stalls = 0;

  for (let step = 1; step < attempted.length; step += 1) {
    const from = attempted[step - 1] as number;
    const to = attempted[step] as number;
    const playedGap = (onsets.played[to] as number) - (onsets.played[from] as number);
    const expectedGap = (onsets.expected[to] as number) - (onsets.expected[from] as number);
    if (expectedGap > 0 && playedGap > expectedGap * 2) stalls += 1;
  }

  return reached * (1 - clampUnit(stalls / (attempted.length - 1)));
}

// Pace over the stretch actually played, scaled by how much of the passage that
// was. Pace alone would let a learner play the first three notes briskly, stop,
// and score full marks for fluency — fluency on a passage that was abandoned is
// not fluency.
function fluencyScore(onsets: AlignedOnsets): number {
  const attempted = attemptedIndices(onsets);
  if (attempted.length < 2) return 0;

  const first = attempted[0] as number;
  const last = attempted[attempted.length - 1] as number;
  const notatedSpan = (onsets.expected[last] as number) - (onsets.expected[first] as number);
  const actualSpan = (onsets.played[last] as number) - (onsets.played[first] as number);
  // Playing faster than notated is not penalised; a sight-read at tempo is the
  // ceiling this component is asking about.
  const pace = actualSpan <= 0 ? 1 : clampUnit(notatedSpan / actualSpan);

  return pace * clampUnit(attempted.length / onsets.expected.length);
}

// Scores a completed run. An empty or abandoned run produces zeros, never NaN:
// a broken number on a results screen destroys trust in every other number
// beside it.
export function scoreReadingAssessment({ passage, answers, latencyMs = 0 }: ReadingAssessmentRun): ReadingScoreResult {
  const notesExpected = answers.length;
  const attempted = answers.filter((answer) => answer.playedMidi !== undefined);
  const base = {
    algorithmVersion: READING_SCORE_ALGORITHM_VERSION,
    difficulty: passage.difficulty,
    notesExpected,
    notesPlayed: attempted.length,
    isProvisional: !READING_SCORE_CALIBRATED,
  };

  if (notesExpected === 0 || attempted.length === 0) {
    return { ...base, score: 0, components: EMPTY_COMPONENTS, confidence: 0 };
  }

  const correct = answers.filter((answer) => answer.playedMidi === answer.expectedMidi).length;

  const expectedTicks = passage.notes.map((note) => note.onsetTicks);
  const played = answers.map((answer) =>
    typeof answer.playedSeconds === "number" && Number.isFinite(answer.playedSeconds)
      ? answer.playedSeconds - latencyMs / 1000
      : undefined,
  );

  const rhythm = gradeRhythm({
    expectedTicks,
    playedSeconds: played.filter((seconds): seconds is number => seconds !== undefined),
    bpm: passage.bpm,
    transport: passage.transport,
    // Already corrected above, so the grader must not subtract it twice.
    latencyMs: 0,
    toleranceMs: toleranceForTempo(passage.bpm),
  });

  const onsets = {
    played,
    expected: expectedTicks.map((ticks) => ticksToSeconds(ticks, passage.bpm, passage.transport)),
  };

  const components: ReadingScoreComponents = {
    noteAccuracy: clampUnit(correct / notesExpected),
    rhythmAccuracy: clampUnit(rhythm.onsetAccuracy),
    continuity: continuityScore(onsets),
    fluency: fluencyScore(onsets),
  };

  const weighted =
    components.noteAccuracy * WEIGHTS.noteAccuracy +
    components.rhythmAccuracy * WEIGHTS.rhythmAccuracy +
    components.continuity * WEIGHTS.continuity +
    components.fluency * WEIGHTS.fluency;

  return {
    ...base,
    score: Math.round(clampUnit(weighted) * 100),
    components,
    confidence: clampUnit(attempted.length / notesExpected),
  };
}

// Whether this result is solid enough to put on a trend line. A number too thin
// to trust is still shown — hiding it would be confusing — but it is not
// allowed to move the learner's history.
export function isTrendworthy(result: ReadingScoreResult): boolean {
  return result.confidence >= MIN_CONFIDENT_COVERAGE;
}

// A plain-language read, leading with the weakest component, because that is
// the one worth working on next.
export function describeReadingScore(result: ReadingScoreResult): string {
  if (result.notesPlayed === 0) return "Nothing was played, so there is nothing to score yet.";

  const entries: Array<[keyof ReadingScoreComponents, string]> = [
    ["noteAccuracy", "Work on the notes themselves — read the pitch before you play it."],
    ["rhythmAccuracy", "The notes are coming, and the rhythm is what slipped. Try it slower with a count-in."],
    ["continuity", "You stopped to work notes out. Keeping going, even imperfectly, is the skill being measured."],
    ["fluency", "This was accurate but hesitant. The same passage a little faster is the next step."],
  ];

  const weakest = entries.reduce((lowest, entry) =>
    result.components[entry[0]] < result.components[lowest[0]] ? entry : lowest,
  );

  if (result.components[weakest[0]] >= 0.9) return "Strong across the board. Try the next difficulty up.";
  return weakest[1];
}
