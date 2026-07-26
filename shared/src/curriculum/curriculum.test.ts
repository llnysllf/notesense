import { describe, expect, it } from "vitest";
import { COMPETENCIES, COMPETENCY_IDS, getCompetency, isCompetencyId } from "./competencies";
import { DIMENSION_KEYS, isDimensionKey, normalizeDimensions } from "./dimensions";
import { clampDifficulty, difficultyBand } from "./difficulty";
import { competencyOrder, getPrerequisites, isReady, PREREQUISITES } from "./prerequisites";
import type { CompetencyId } from "./competencies";

describe("competencies", () => {
  it("exposes a consistent catalog and lookups", () => {
    expect(COMPETENCIES.length).toBeGreaterThan(5);
    expect(COMPETENCY_IDS).toEqual(COMPETENCIES.map((c) => c.id));
    expect(getCompetency("reading.pitch.staff-to-key")?.domain).toBe("reading");
    expect(isCompetencyId("reading.pitch.staff-to-key")).toBe(true);
    expect(isCompetencyId("nope")).toBe(false);
    expect(isCompetencyId(42)).toBe(false);
  });
});

describe("dimensions", () => {
  it("recognizes known keys", () => {
    expect(isDimensionKey("clef")).toBe(true);
    expect(isDimensionKey("banana")).toBe(false);
    expect(DIMENSION_KEYS).toContain("inputMode");
  });

  it("keeps known keys with primitive values and drops the rest", () => {
    expect(normalizeDimensions({ clef: "treble", tempo: 90, polyphony: true, unknown: "x", meter: { a: 1 } })).toEqual({
      clef: "treble",
      tempo: 90,
      polyphony: true,
    });
    expect(normalizeDimensions(null)).toEqual({});
    expect(normalizeDimensions({ tempo: Number.NaN })).toEqual({});
    expect(normalizeDimensions({ clef: "x".repeat(80) })).toEqual({});
  });
});

describe("difficulty", () => {
  it("clamps to 0..1", () => {
    expect(clampDifficulty(-1)).toBe(0);
    expect(clampDifficulty(2)).toBe(1);
    expect(clampDifficulty(0.4)).toBe(0.4);
    expect(clampDifficulty(Number.NaN)).toBe(0);
  });

  it("bands the scale", () => {
    expect(difficultyBand(0.1)).toBe("intro");
    expect(difficultyBand(0.25)).toBe("easy");
    expect(difficultyBand(0.5)).toBe("medium");
    expect(difficultyBand(0.75)).toBe("hard");
  });
});

describe("prerequisites", () => {
  it("has a fully declared, acyclic graph", () => {
    // Every declared prerequisite must be a known competency id.
    const known = new Set<string>(COMPETENCY_IDS);
    for (const id of COMPETENCY_IDS) {
      for (const dep of PREREQUISITES[id]) expect(known.has(dep)).toBe(true);
    }
    const order = competencyOrder();
    const seen = new Set<CompetencyId>();
    for (const id of order) {
      for (const dep of getPrerequisites(id)) expect(seen.has(dep)).toBe(true);
      seen.add(id);
    }
    expect(order).toHaveLength(COMPETENCY_IDS.length);
  });

  it("reports readiness against mastered prerequisites", () => {
    expect(isReady("reading.pitch.staff-to-key", new Set())).toBe(true);
    expect(isReady("reading.interval.horizontal", new Set())).toBe(false);
    expect(isReady("reading.interval.horizontal", new Set(["reading.pitch.staff-to-key"]))).toBe(true);
  });

  it("throws on a cyclic graph", () => {
    expect(() => competencyOrder({ a: ["b"], b: ["a"] })).toThrow(/cycle/);
  });
});
