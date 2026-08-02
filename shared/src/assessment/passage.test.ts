import { describe, expect, it } from "vitest";
import {
  areFormsEquivalent,
  buildAssessmentPassage,
  isOnTargetDensity,
  passageProfile,
  ASSESSMENT_FORM_VERSION,
} from "./passage";

const SEEDS = Array.from({ length: 60 }, (_, index) => `seed-${index}`);
const BAND_DIFFICULTIES = [0.1, 0.35, 0.6, 0.9];

describe("assessment passages", () => {
  it("is deterministic in its seed, so a form can be rebuilt anywhere", () => {
    const first = buildAssessmentPassage({ difficulty: 0.5, seed: "repeatable" });
    const second = buildAssessmentPassage({ difficulty: 0.5, seed: "repeatable" });

    expect(second).toEqual(first);
    expect(first.formId).toBe(`reading-score:v${ASSESSMENT_FORM_VERSION}:medium:repeatable`);
  });

  it("produces different material for different seeds", () => {
    const a = buildAssessmentPassage({ difficulty: 0.5, seed: "a" });
    const b = buildAssessmentPassage({ difficulty: 0.5, seed: "b" });

    expect(a.notes.map((note) => note.midi)).not.toEqual(b.notes.map((note) => note.midi));
  });

  it("treats two difficulties in the same band as the same test", () => {
    // 0.51 and 0.58 are both "medium"; a learner should not get a quietly
    // different exam because their placement moved by a hundredth.
    const a = buildAssessmentPassage({ difficulty: 0.51, seed: "x" });
    const b = buildAssessmentPassage({ difficulty: 0.58, seed: "x" });

    expect(b.notes).toEqual(a.notes);
    expect(b.bpm).toBe(a.bpm);
  });

  it("keeps forms in a band equivalent, which is what makes two sittings comparable", () => {
    for (const difficulty of BAND_DIFFICULTIES) {
      const forms = SEEDS.map((seed) => buildAssessmentPassage({ difficulty, seed }));
      const reference = forms[0] as (typeof forms)[number];

      for (const form of forms) {
        expect(isOnTargetDensity(form)).toBe(true);
        expect(areFormsEquivalent(reference, form)).toBe(true);
      }
    }
  });

  it("does not call forms from different bands equivalent", () => {
    const easy = buildAssessmentPassage({ difficulty: 0.3, seed: "x" });
    const hard = buildAssessmentPassage({ difficulty: 0.9, seed: "x" });

    expect(areFormsEquivalent(easy, hard)).toBe(false);
  });

  it("stays inside the band's range and leap limit", () => {
    for (const difficulty of BAND_DIFFICULTIES) {
      const profile = passageProfile(difficulty);

      for (const seed of SEEDS) {
        const { notes } = buildAssessmentPassage({ difficulty, seed });

        for (const [index, note] of notes.entries()) {
          expect(note.midi).toBeGreaterThanOrEqual(profile.lowMidi);
          expect(note.midi).toBeLessThanOrEqual(profile.highMidi);
          if (index === 0) continue;
          const previous = notes[index - 1] as (typeof notes)[number];
          // A repeated pitch would measure memory of the last prompt, and a
          // leap past the limit would be a harder test than the band promises.
          expect(note.midi).not.toBe(previous.midi);
          expect(Math.abs(note.midi - previous.midi)).toBeLessThanOrEqual(profile.maxLeap);
        }
      }
    }
  });

  it("lays notes out on a strictly increasing tick grid inside the passage", () => {
    for (const difficulty of BAND_DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 20)) {
        const passage = buildAssessmentPassage({ difficulty, seed });

        expect(passage.notes.length).toBeGreaterThan(0);
        expect(passage.lengthTicks).toBeGreaterThan(0);

        for (const [index, note] of passage.notes.entries()) {
          expect(Number.isInteger(note.onsetTicks)).toBe(true);
          expect(note.durationTicks).toBeGreaterThan(0);
          expect(note.onsetTicks).toBeLessThan(passage.lengthTicks);
          if (index === 0) expect(note.onsetTicks).toBe(0);
          else expect(note.onsetTicks).toBeGreaterThan((passage.notes[index - 1] as { onsetTicks: number }).onsetTicks);
        }
      }
    }
  });

  it("keeps the lower bands in a key rather than sprinkling accidentals", () => {
    const blackKeys = new Set([1, 3, 6, 8, 10]);

    for (const difficulty of [0.1, 0.35, 0.6]) {
      for (const seed of SEEDS) {
        const { notes } = buildAssessmentPassage({ difficulty, seed });
        // Random sharps are not a harder reading test, just a less musical one.
        expect(notes.every((note) => !blackKeys.has(note.midi % 12))).toBe(true);
      }
    }
  });

  it("reads accidentals at the top band, where that is the point", () => {
    const blackKeys = new Set([1, 3, 6, 8, 10]);
    const withAccidentals = SEEDS.filter((seed) =>
      buildAssessmentPassage({ difficulty: 0.9, seed }).notes.some((note) => blackKeys.has(note.midi % 12)),
    );

    expect(withAccidentals.length).toBeGreaterThan(SEEDS.length / 2);
  });

  it("clamps difficulty rather than generating something outside the curriculum", () => {
    expect(buildAssessmentPassage({ difficulty: -5, seed: "s" }).band).toBe("intro");
    expect(buildAssessmentPassage({ difficulty: 99, seed: "s" }).band).toBe("hard");
    expect(buildAssessmentPassage({ difficulty: Number.NaN, seed: "s" }).difficulty).toBe(0);
  });
});
