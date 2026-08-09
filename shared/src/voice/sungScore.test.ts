import { describe, expect, it } from "vitest";
import { buildContour, centreMidi, onsetSeconds, type PitchFrame } from "./contour";
import { describeSinging, scoreSinging, type SungTarget } from "./sungScore";

const FRAME_SECONDS = 0.02;

function frames(
  build: (index: number, atSeconds: number) => { midi: number; voiced?: boolean; confidence?: number },
  count: number,
): PitchFrame[] {
  return Array.from({ length: count }, (_, index) => {
    const atSeconds = index * FRAME_SECONDS;
    const { midi, voiced = true, confidence = 0.9 } = build(index, atSeconds);
    return { atSeconds, midi, confidence, voiced, level: 0.2 };
  });
}

// One steady note held for a second.
function held(midi: number, seconds = 1, offsetSeconds = 0): PitchFrame[] {
  const count = Math.round(seconds / FRAME_SECONDS);
  return Array.from({ length: count }, (_, index) => ({
    atSeconds: offsetSeconds + index * FRAME_SECONDS,
    midi,
    confidence: 0.9,
    voiced: true,
    level: 0.2,
  }));
}

const ONE_NOTE: SungTarget[] = [{ midi: 60, onsetSeconds: 0, durationSeconds: 1 }];

describe("sung scoring", () => {
  it("gives a steady, accurate note near full marks", () => {
    const score = scoreSinging({ targets: ONE_NOTE, contour: held(60) });

    expect(score.components.pitchCentre).toBeGreaterThan(0.95);
    expect(score.components.pitchStability).toBe(1);
    expect(score.summary.inTune).toBe(true);
    expect(score.total).toBeGreaterThan(0.9);
  });

  it("does not punish vibrato", () => {
    // A healthy 6Hz wobble of ±40 cents — a trained sound, not a fault.
    const vibrato = frames((_, atSeconds) => ({ midi: 60 + 0.4 * Math.sin(2 * Math.PI * 6 * atSeconds) }), 50);
    const steady = held(60);

    const wobbling = scoreSinging({ targets: ONE_NOTE, contour: vibrato });
    const flat = scoreSinging({ targets: ONE_NOTE, contour: steady });

    expect(wobbling.summary.inTune).toBe(true);
    // Vibrato averages out of the centre line, so steadiness survives it.
    expect(wobbling.components.pitchStability).toBeGreaterThan(0.85);
    expect(flat.total - wobbling.total).toBeLessThan(0.1);
  });

  it("does mark down a note that genuinely drifts", () => {
    // Sliding a semitone over the held note: not vibrato, actual drift.
    const drifting = frames((index) => ({ midi: 60 + index / 50 }), 50);
    const score = scoreSinging({ targets: ONE_NOTE, contour: drifting });

    expect(score.components.pitchStability).toBeLessThan(0.8);
  });

  it("says which way a flat note was out", () => {
    const flat = scoreSinging({ targets: ONE_NOTE, contour: held(59.5) });

    expect(flat.summary.centsError).toBeCloseTo(-50, 0);
    expect(flat.summary.inTune).toBe(false);
    expect(describeSinging(flat)).toMatch(/under the pitch/i);
  });

  it("says which way a sharp note was out", () => {
    const sharp = scoreSinging({ targets: ONE_NOTE, contour: held(60.6) });

    expect(sharp.summary.centsError).toBeGreaterThan(0);
    expect(describeSinging(sharp)).toMatch(/over the pitch/i);
  });

  it("scores an attempt with nothing sung as zeros, not NaN", () => {
    const silent = frames(() => ({ midi: 0, voiced: false }), 20);
    const score = scoreSinging({ targets: ONE_NOTE, contour: silent });

    expect(score.total).toBe(0);
    for (const value of Object.values(score.components)) expect(Number.isNaN(value)).toBe(false);
    expect(describeSinging(score)).toMatch(/nothing to score/i);
  });

  it("has nothing to score without a target", () => {
    const score = scoreSinging({ targets: [], contour: held(60) });

    expect(score.total).toBe(0);
    expect(score.perNote).toEqual([]);
  });

  it("marks down a phrase that was abandoned part way", () => {
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 62, onsetSeconds: 0.5, durationSeconds: 0.5 },
      { midi: 64, onsetSeconds: 1, durationSeconds: 0.5 },
    ];
    const score = scoreSinging({ targets, contour: held(60, 0.5) });

    expect(score.components.completion).toBeCloseTo(1 / 3, 5);
    expect(score.perNote.filter((note) => note.sung)).toHaveLength(1);
    expect(describeSinging(score)).toMatch(/stopped part way/i);
  });

  it("reports each note separately, so a learner can see which one went wrong", () => {
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 64, onsetSeconds: 0.5, durationSeconds: 0.5 },
    ];
    const contour = [...held(60, 0.5), ...held(62, 0.5, 0.5)];
    const score = scoreSinging({ targets, contour });

    expect(score.perNote[0]?.centsError).toBeCloseTo(0, 0);
    // The second note was sung a tone flat of its target.
    expect(score.perNote[1]?.centsError).toBeCloseTo(-200, 0);
  });

  it("judges the move between notes, not only where they landed", () => {
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 67, onsetSeconds: 0.5, durationSeconds: 0.5 },
    ];
    // Both notes a tone high: every pitch is wrong, but the interval is right.
    const shifted = [...held(62, 0.5), ...held(69, 0.5, 0.5)];
    const score = scoreSinging({ targets, contour: shifted });

    expect(score.components.transitions).toBe(1);
    expect(score.components.pitchCentre).toBeLessThan(0.9);
  });

  it("never grades tone quality", () => {
    const score = scoreSinging({ targets: ONE_NOTE, contour: held(60) });

    // The components are the ones a teacher would name; timbre is not among
    // them, and no wording implies it.
    expect(Object.keys(score.components).sort()).toEqual([
      "completion",
      "pitchCentre",
      "pitchStability",
      "rhythm",
      "transitions",
    ]);
    for (const word of ["tone", "timbre", "breathy", "nasal", "quality"]) {
      expect(describeSinging(score).toLowerCase()).not.toContain(word);
    }
  });

  it("stores only derived features, never frames or audio", () => {
    const score = scoreSinging({ targets: ONE_NOTE, contour: held(60) });

    // This object is the whole of what is persisted.
    expect(Object.keys(score.summary).sort()).toEqual([
      "centsError",
      "durationError",
      "inTune",
      "onsetErrorMs",
      "stability",
    ]);
    for (const value of Object.values(score.summary)) {
      expect(["number", "boolean"]).toContain(typeof value);
    }
  });
});

describe("contour cleaning", () => {
  it("folds an octave error back where it belongs", () => {
    const raw = held(60);
    (raw[10] as PitchFrame).midi = 72;

    const contour = buildContour(raw);

    expect(contour[10]?.midi).toBeCloseTo(60, 5);
  });

  it("removes a single wild frame without flattening vibrato", () => {
    const vibrato = frames((_, atSeconds) => ({ midi: 60 + 0.4 * Math.sin(2 * Math.PI * 6 * atSeconds) }), 50);
    const withSpike = vibrato.map((frame, index) => (index === 25 ? { ...frame, midi: 64 } : frame));

    const contour = buildContour(withSpike);
    const spread = Math.max(...contour.map((f) => f.midi)) - Math.min(...contour.map((f) => f.midi));

    expect(contour[25]?.midi).toBeLessThan(61);
    // The wobble is still there — it was the point, not the noise.
    expect(spread).toBeGreaterThan(0.5);
  });

  it("treats a low-confidence frame as unvoiced rather than trusting it", () => {
    const raw = frames((index) => ({ midi: 60, confidence: index === 5 ? 0.2 : 0.9 }), 20);

    const contour = buildContour(raw);

    expect(contour[5]?.voiced).toBe(false);
    expect(contour[5]?.midi).toBe(0);
  });

  it("finds where each note started", () => {
    const contour = [...held(60, 0.4), ...held(64, 0.4, 0.4)];

    expect(onsetSeconds(contour)).toEqual([0, 0.4]);
  });

  it("does not call a scoop within a note a new note", () => {
    const scooped = frames((index) => ({ midi: index < 3 ? 59.5 + index * 0.15 : 60 }), 20);

    expect(onsetSeconds(buildContour(scooped))).toEqual([0]);
  });

  it("reports the centre of a held note", () => {
    expect(centreMidi(held(62))).toBeCloseTo(62, 5);
    expect(centreMidi([])).toBe(0);
  });
});

describe("sung scoring branches", () => {
  it("names the timing when everything else is right", () => {
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 60, onsetSeconds: 0.5, durationSeconds: 0.5 },
    ];
    // Sung in tune, but the second note arrives late enough to matter.
    const contour = [...held(60, 0.4), ...held(60, 0.1, 0.4), ...held(62, 0.02, 0.52), ...held(60, 0.4, 0.54)];
    const score = scoreSinging({ targets, contour });

    expect(score.summary.inTune).toBe(true);
    expect(typeof describeSinging(score)).toBe("string");
  });

  it("says the moves are landing short when intervals are wrong", () => {
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 67, onsetSeconds: 0.5, durationSeconds: 0.5 },
    ];
    // Right start, but only halfway to the second note.
    const contour = [...held(60, 0.5), ...held(63.5, 0.5, 0.5)];
    const score = scoreSinging({ targets, contour });

    expect(score.components.transitions).toBeLessThan(0.6);
  });

  it("says the pitch drifts when it drifts but stays in tune on average", () => {
    // Sweeps two semitones either side of the target: the median is still
    // centred, so the singer is in tune on average and plainly not steady.
    const drifting = frames((index) => ({ midi: 59 + index / 25 }), 50);
    const score = scoreSinging({ targets: ONE_NOTE, contour: drifting });

    expect(score.summary.inTune).toBe(true);
    expect(score.components.pitchStability).toBeLessThan(0.6);
    expect(describeSinging(score)).toMatch(/drifts/i);
  });

  it("has one note to judge and no transitions to judge", () => {
    const score = scoreSinging({ targets: ONE_NOTE, contour: held(60) });

    // A single note has no moves between notes; that is full marks, not zero.
    expect(score.components.transitions).toBe(1);
  });

  it("gives no transition credit when nothing was sung at all", () => {
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 62, onsetSeconds: 0.5, durationSeconds: 0.5 },
    ];
    const silent = frames(() => ({ midi: 0, voiced: false }), 50);

    expect(scoreSinging({ targets, contour: silent }).components.transitions).toBe(0);
  });
});

describe("sung scoring edges", () => {
  it("handles a note with a single frame, where there is no drift to measure", () => {
    const oneFrame: PitchFrame[] = [{ atSeconds: 0, midi: 60, confidence: 0.9, voiced: true, level: 0.2 }];
    const score = scoreSinging({ targets: ONE_NOTE, contour: oneFrame });

    expect(Number.isNaN(score.components.pitchStability)).toBe(false);
    expect(score.perNote[0]?.sung).toBe(true);
  });

  it("scores a note sung with no onset recorded against it", () => {
    // Frames arrive inside the note's window but the run never produced an
    // onset for that position, so the timing is simply unknown.
    const targets: SungTarget[] = [
      { midi: 60, onsetSeconds: 0, durationSeconds: 0.5 },
      { midi: 62, onsetSeconds: 0.5, durationSeconds: 0.5 },
    ];
    const contour = held(60, 1);
    const score = scoreSinging({ targets, contour });

    expect(score.perNote[1]?.onsetErrorMs).toBeUndefined();
    expect(Number.isNaN(score.components.rhythm)).toBe(false);
  });

  it("says the timing is off when everything else is right", () => {
    const targets: SungTarget[] = [{ midi: 60, onsetSeconds: 0.5, durationSeconds: 1 }];
    // Sung in tune and steadily, but starting half a second early.
    const score = scoreSinging({ targets, contour: held(60, 1.5) });

    expect(score.summary.inTune).toBe(true);
    expect(score.components.rhythm).toBeLessThan(0.6);
    expect(describeSinging(score)).toMatch(/away from the beat/i);
  });
});
