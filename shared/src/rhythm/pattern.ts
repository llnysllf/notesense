// Rhythm patterns: what the learner is asked to play.
//
// A pattern is authored in rational musical time and compiled to integer ticks,
// the same as any other notated material, so a rhythm drill and a piece of
// notation mean the same thing by "a dotted quarter". Generation is seeded, so a
// pattern is reproducible and a test can assert its shape.

import { createRng, randInt } from "../exercises/seededRng";
import {
  addRational,
  dotted,
  DURATION,
  rationalToTicks,
  TRANSPORT_V1,
  tuplet,
  type Rational,
  type Transport,
} from "../music/time";
import { measureLengthInQuarters, type Meter } from "../music/score";

export type RhythmEvent = {
  // Offset from the start of the pattern, in quarter-note units.
  offset: Rational;
  duration: Rational;
  isRest: boolean;
};

export type RhythmPattern = {
  meter: Meter;
  bars: number;
  events: RhythmEvent[];
  seed: string;
};

export type RhythmVocabulary = "simple" | "eighths" | "sixteenths" | "dotted" | "triplets";

// Vocabularies are made of *cells* rather than loose note values, and every cell
// spans a whole number of quarter notes. That is both how rhythm is actually
// read — a triplet is a group of three in the space of a beat, not three
// independent thirds — and what guarantees a bar can always be filled exactly.
// Picking loose values would let a bar strand an unfillable remainder such as a
// sixth of a beat.
const TRIPLET_EIGHTH = tuplet(DURATION.eighth, { num: 2, den: 3 });

const VOCABULARY_CELLS: Readonly<Record<RhythmVocabulary, readonly (readonly Rational[])[]>> = {
  simple: [[DURATION.whole], [DURATION.half], [DURATION.quarter]],
  eighths: [[DURATION.half], [DURATION.quarter], [DURATION.eighth, DURATION.eighth]],
  sixteenths: [
    [DURATION.quarter],
    [DURATION.eighth, DURATION.eighth],
    [DURATION.sixteenth, DURATION.sixteenth, DURATION.sixteenth, DURATION.sixteenth],
  ],
  dotted: [[DURATION.quarter], [dotted(DURATION.quarter), DURATION.eighth], [dotted(DURATION.half), DURATION.quarter]],
  triplets: [[DURATION.quarter], [DURATION.eighth, DURATION.eighth], [TRIPLET_EIGHTH, TRIPLET_EIGHTH, TRIPLET_EIGHTH]],
};

export const RHYTHM_VOCABULARIES = Object.keys(VOCABULARY_CELLS) as RhythmVocabulary[];

const MAX_BARS = 8;
const REST_CHANCE = 0.15;

export type RhythmPatternSpec = {
  meter: Meter;
  bars: number;
  vocabulary: RhythmVocabulary;
  seed: string;
  // Rests make a pattern harder to feel; off by default for pulse work.
  allowRests?: boolean;
};

const remaining = (used: Rational, total: Rational): Rational => ({
  num: total.num * used.den - used.num * total.den,
  den: total.den * used.den,
});

const fits = (value: Rational, left: Rational) => value.num * left.den <= left.num * value.den;

const cellLength = (cell: readonly Rational[]): Rational =>
  cell.reduce<Rational>((total, value) => addRational(total, value), { num: 0, den: 1 });

// Fills each bar exactly. A pattern that overruns its bar is not a rhythm, so
// values that do not fit are skipped rather than truncated.
export function generateRhythmPattern({
  meter,
  bars,
  vocabulary,
  seed,
  allowRests = false,
}: RhythmPatternSpec): RhythmPattern {
  const rng = createRng(`rhythm:${seed}`);
  const barCount = Math.min(MAX_BARS, Math.max(1, Math.round(bars)));
  const barLength = measureLengthInQuarters(meter);
  const cells = VOCABULARY_CELLS[vocabulary];

  const events: RhythmEvent[] = [];
  let cursor: Rational = { num: 0, den: 1 };

  for (let bar = 0; bar < barCount; bar += 1) {
    let used: Rational = { num: 0, den: 1 };

    // Guard the loop on remaining space rather than a counter, so an exhausted
    // bar always terminates even if no value fits.
    while (used.num * barLength.den < barLength.num * used.den) {
      const left = remaining(used, barLength);
      const candidates = cells.filter((cell) => fits(cellLength(cell), left));
      if (candidates.length === 0) break;

      const cell = candidates[randInt(rng, 0, candidates.length - 1)] as readonly Rational[];
      for (const value of cell) {
        events.push({ offset: cursor, duration: value, isRest: allowRests && rng() < REST_CHANCE });
        cursor = addRational(cursor, value);
        used = addRational(used, value);
      }
    }

    // If nothing fit, the bar is still consumed so offsets stay aligned.
    const leftover = remaining(used, barLength);
    if (leftover.num > 0) cursor = addRational(cursor, leftover);
  }

  return { meter, bars: barCount, events, seed };
}

// The expected onsets, in integer ticks. Rests are not onsets: the learner plays
// the notes, not the silences.
export function patternOnsetTicks(pattern: RhythmPattern, transport: Transport = TRANSPORT_V1): number[] {
  return pattern.events.flatMap((event) => {
    if (event.isRest) return [];
    const ticks = rationalToTicks(event.offset, transport);
    return ticks === undefined ? [] : [ticks];
  });
}

// Total pattern length in ticks, for the cursor and for knowing when a run ends.
export function patternLengthTicks(pattern: RhythmPattern, transport: Transport = TRANSPORT_V1): number {
  const barTicks = rationalToTicks(measureLengthInQuarters(pattern.meter), transport) ?? 0;
  return barTicks * pattern.bars;
}
