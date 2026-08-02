// The material a Reading Score is measured on.
//
// Two rules make an assessment worth trusting, and both are structural rather
// than procedural. The passage must be *unseen* — generated from a seed, never
// drawn from the built-in library or from anything the learner has practised —
// so the result measures reading rather than recall. And two forms at the same
// difficulty must be *equivalent*: same length, tempo, rhythmic vocabulary and
// range, differing only in which notes appear. Without that second property a
// score cannot be compared to the learner's own previous score, which is the
// only comparison this feature makes.

import { clampDifficulty, difficultyBand, type DifficultyBand } from "../curriculum/difficulty";
import { createRng, randInt } from "../exercises/seededRng";
import { rationalToTicks, TRANSPORT_V1, type Transport } from "../music/time";
import { type Meter } from "../music/score";
import {
  generateRhythmPattern,
  patternLengthTicks,
  type RhythmPattern,
  type RhythmVocabulary,
} from "../rhythm/pattern";

export const ASSESSMENT_FORM_VERSION = 1;

export type AssessmentNote = {
  midi: number;
  onsetTicks: number;
  durationTicks: number;
};

export type AssessmentPassage = {
  // Identifies the *form*, not the sitting: every property that has to match for
  // two passages to be comparable is encoded here.
  formId: string;
  formVersion: number;
  seed: string;
  difficulty: number;
  band: DifficultyBand;
  meter: Meter;
  bars: number;
  bpm: number;
  lowMidi: number;
  highMidi: number;
  notes: AssessmentNote[];
  lengthTicks: number;
  transport: Transport;
};

// Everything that must be identical across equivalent forms. Held as a table
// per band rather than as a continuous function of difficulty, because two
// passages at 0.51 and 0.58 should be the same test, not almost the same test.
export type PassageProfile = {
  bars: number;
  bpm: number;
  meter: Meter;
  vocabulary: RhythmVocabulary;
  lowMidi: number;
  highMidi: number;
  // Largest jump allowed between consecutive notes, in semitones. Reading a
  // stepwise line and reading wide leaps are different skills; difficulty
  // controls which one is being asked for.
  maxLeap: number;
  // Whether the passage may use black keys. Real sight-reading material is in a
  // key; a line of randomly sprinkled sharps is not a harder reading test so
  // much as a different, less musical one. Accidentals arrive at the top band,
  // where reading them is the point.
  allowAccidentals: boolean;
  // How many notes the form aims for. Rhythm generation is random within its
  // vocabulary, so two bars could come out as one whole note or eight quarters
  // — the same length on paper and a completely different reading task. Forms
  // are steered to a target density so equivalent forms really are equivalent.
  targetNotes: number;
};

const COMMON_TIME: Meter = { beats: 4, beatUnit: 4 };

// Every band stays inside what one treble staff reads with a few ledger lines.
// The Reading Score measures treble reading at this version; bass and grand
// staff arrive with the wider range work rather than being faked here.

const PROFILES: Readonly<Record<DifficultyBand, PassageProfile>> = {
  intro: {
    bars: 2,
    bpm: 60,
    meter: COMMON_TIME,
    vocabulary: "simple",
    lowMidi: 60,
    highMidi: 72,
    maxLeap: 4,
    allowAccidentals: false,
    targetNotes: 6,
  },
  easy: {
    bars: 4,
    bpm: 72,
    meter: COMMON_TIME,
    vocabulary: "eighths",
    lowMidi: 57,
    highMidi: 76,
    maxLeap: 7,
    allowAccidentals: false,
    targetNotes: 20,
  },
  medium: {
    bars: 4,
    bpm: 88,
    meter: COMMON_TIME,
    vocabulary: "dotted",
    lowMidi: 55,
    highMidi: 79,
    maxLeap: 12,
    allowAccidentals: false,
    targetNotes: 15,
  },
  hard: {
    bars: 4,
    bpm: 104,
    meter: COMMON_TIME,
    vocabulary: "sixteenths",
    lowMidi: 55,
    highMidi: 84,
    maxLeap: 16,
    allowAccidentals: true,
    targetNotes: 36,
  },
};

// How far a form's note count may sit from its band's target and still count as
// an equivalent form.
export const FORM_DENSITY_TOLERANCE = 2;

// Candidate rhythms tried per form. Selection is over derived seeds, so it stays
// deterministic and terminates — a retry loop that waits for a good draw would
// do neither.
const RHYTHM_CANDIDATES = 16;

export function passageProfile(difficulty: number): PassageProfile {
  return PROFILES[difficultyBand(difficulty)];
}

export type AssessmentPassageSpec = {
  difficulty: number;
  seed: string;
  transport?: Transport;
};

// Semitone offsets of the black keys within an octave.
const BLACK_KEY_OFFSETS = new Set([1, 3, 6, 8, 10]);

// Every pitch the band is allowed to use, in order. Building the pool up front
// keeps the walk below simple: it picks from what is playable rather than
// picking a semitone it then has to nudge onto something legal.
function pitchPool(profile: PassageProfile): number[] {
  const pool: number[] = [];
  for (let midi = profile.lowMidi; midi <= profile.highMidi; midi += 1) {
    if (profile.allowAccidentals || !BLACK_KEY_OFFSETS.has(midi % 12)) pool.push(midi);
  }
  return pool;
}

// Picks the next pitch: a seeded walk that stays inside the pool and inside the
// band's leap limit, and never repeats a pitch immediately — a repeat measures
// memory of the last note rather than reading of this one.
function nextMidi(rng: () => number, previous: number | undefined, pool: readonly number[], maxLeap: number): number {
  if (previous === undefined) return pool[randInt(rng, 0, pool.length - 1)] as number;

  const candidates = pool.filter((midi) => midi !== previous && Math.abs(midi - previous) <= maxLeap);
  if (candidates.length > 0) return candidates[randInt(rng, 0, candidates.length - 1)] as number;

  // No band reaches this today — every profile's pool has neighbours well
  // inside its leap limit. Stepping to the adjacent pitch keeps a narrower
  // future band from producing a repeated note, which would measure memory.
  const index = pool.indexOf(previous);
  return pool[index === pool.length - 1 ? index - 1 : index + 1] as number;
}

// Chooses the candidate rhythm closest to the band's target density. Ties go to
// the earlier candidate, so the choice is a function of the seed alone.
function pickRhythm(seed: string, profile: PassageProfile): RhythmPattern {
  let best: RhythmPattern | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let candidate = 0; candidate < RHYTHM_CANDIDATES; candidate += 1) {
    const pattern = generateRhythmPattern({
      meter: profile.meter,
      bars: profile.bars,
      vocabulary: profile.vocabulary,
      seed: `assessment:${seed}:${candidate}`,
    });
    const distance = Math.abs(pattern.events.length - profile.targetNotes);
    if (distance < bestDistance) {
      best = pattern;
      bestDistance = distance;
      if (distance === 0) break;
    }
  }

  return best as RhythmPattern;
}

// Builds one assessment form. Deterministic in the seed and the difficulty, so
// the same form can be rebuilt on another device and a result can be checked
// against the material it came from.
export function buildAssessmentPassage({
  difficulty,
  seed,
  transport = TRANSPORT_V1,
}: AssessmentPassageSpec): AssessmentPassage {
  const clamped = clampDifficulty(difficulty);
  const band = difficultyBand(clamped);
  const profile = PROFILES[band];

  const pattern = pickRhythm(seed, profile);

  const rng = createRng(`assessment-pitch:${seed}`);
  const pool = pitchPool(profile);
  const notes: AssessmentNote[] = [];
  let previous: number | undefined;

  for (const event of pattern.events) {
    if (event.isRest) continue;
    const onsetTicks = rationalToTicks(event.offset, transport);
    const durationTicks = rationalToTicks(event.duration, transport);
    // A value that does not land on the tick grid is not notatable at this
    // resolution, so it is skipped rather than rounded into a wrong rhythm.
    if (onsetTicks === undefined || durationTicks === undefined) continue;

    const midi = nextMidi(rng, previous, pool, profile.maxLeap);
    notes.push({ midi, onsetTicks, durationTicks });
    previous = midi;
  }

  return {
    formId: `reading-score:v${ASSESSMENT_FORM_VERSION}:${band}:${seed}`,
    formVersion: ASSESSMENT_FORM_VERSION,
    seed,
    difficulty: clamped,
    band,
    meter: profile.meter,
    bars: profile.bars,
    bpm: profile.bpm,
    lowMidi: profile.lowMidi,
    highMidi: profile.highMidi,
    notes,
    lengthTicks: patternLengthTicks(pattern, transport),
    transport,
  };
}

// Whether a form landed close enough to its band's intended density. Measured
// against the target rather than against the other form, so equivalence is a
// property each form has on its own and does not drift as forms are compared.
export function isOnTargetDensity(passage: AssessmentPassage): boolean {
  const profile = PROFILES[passage.band];
  return Math.abs(passage.notes.length - profile.targetNotes) <= FORM_DENSITY_TOLERANCE;
}

// Whether two sittings measured the same thing. Used before any comparison is
// shown, so a learner is never told they improved when the test changed.
export function areFormsEquivalent(a: AssessmentPassage, b: AssessmentPassage): boolean {
  return (
    a.formVersion === b.formVersion &&
    a.band === b.band &&
    a.bars === b.bars &&
    a.bpm === b.bpm &&
    a.lowMidi === b.lowMidi &&
    a.highMidi === b.highMidi &&
    isOnTargetDensity(a) &&
    isOnTargetDensity(b)
  );
}
