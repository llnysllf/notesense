import { describe, expect, it } from "vitest";
import { DAILY_PLAN_VERSION } from "./dailyPlan";
import { normalizeDailyPlan } from "./normalize";

const block = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  role: "focus",
  activity: "reading",
  title: "Focus",
  reason: "Because it is shaky.",
  estimatedSeconds: 180,
  ...over,
});

const stored = (over: Record<string, unknown> = {}) => ({
  planVersion: DAILY_PLAN_VERSION,
  localDate: "2026-05-14",
  curriculumVersion: 1,
  generatedAtIso: "2026-05-14T09:00:00.000Z",
  estimatedSeconds: 180,
  blocks: [block("focus-0")],
  completedBlockIds: [],
  ...over,
});

describe("normalizeDailyPlan", () => {
  it("accepts a well-formed stored plan", () => {
    const plan = normalizeDailyPlan(stored());

    expect(plan?.localDate).toBe("2026-05-14");
    expect(plan?.blocks).toHaveLength(1);
    expect(plan?.completedBlockIds).toEqual([]);
  });

  it("rejects anything that is not a usable plan", () => {
    expect(normalizeDailyPlan(null)).toBeUndefined();
    expect(normalizeDailyPlan("plan")).toBeUndefined();
    // A plan written by a different planner is regenerated, not reinterpreted.
    expect(normalizeDailyPlan(stored({ planVersion: 0 }))).toBeUndefined();
    expect(normalizeDailyPlan(stored({ localDate: "14/05/2026" }))).toBeUndefined();
    expect(normalizeDailyPlan(stored({ generatedAtIso: "not-a-date" }))).toBeUndefined();
    expect(normalizeDailyPlan(stored({ blocks: "nope" }))).toBeUndefined();
    expect(normalizeDailyPlan(stored({ blocks: [] }))).toBeUndefined();
  });

  it("drops malformed blocks and keeps valid ones", () => {
    const plan = normalizeDailyPlan(
      stored({
        blocks: [
          block("focus-0"),
          block("bad-role", { role: "sideways" }),
          block("bad-activity", { activity: "juggling" }),
          block("bad-seconds", { estimatedSeconds: 0 }),
          { id: "no-fields" },
          block("confidence-1", { role: "confidence", activity: "songs", estimatedSeconds: 120 }),
        ],
      }),
    );

    expect(plan?.blocks.map((entry) => entry.id)).toEqual(["focus-0", "confidence-1"]);
    // The stored total is recomputed rather than trusted.
    expect(plan?.estimatedSeconds).toBe(300);
  });

  it("keeps only completed and active ids that exist in the plan", () => {
    const plan = normalizeDailyPlan(
      stored({ completedBlockIds: ["focus-0", "ghost", "focus-0"], activeBlockId: "ghost" }),
    );

    expect(plan?.completedBlockIds).toEqual(["focus-0"]);
    expect(plan?.activeBlockId).toBeUndefined();

    const withActive = normalizeDailyPlan(stored({ activeBlockId: "focus-0" }));
    expect(withActive?.activeBlockId).toBe("focus-0");
  });

  it("keeps a competency tag only when it is a known id", () => {
    const plan = normalizeDailyPlan(
      stored({
        blocks: [
          block("focus-0", { competencyId: "reading.pitch.staff-to-key" }),
          block("focus-1", { competencyId: "made.up" }),
        ],
      }),
    );

    expect(plan?.blocks[0]?.competencyId).toBe("reading.pitch.staff-to-key");
    expect(plan?.blocks[1]?.competencyId).toBeUndefined();
  });

  it("defaults a missing curriculum version and caps block count", () => {
    expect(normalizeDailyPlan(stored({ curriculumVersion: "old" }))?.curriculumVersion).toBe(1);

    const many = Array.from({ length: 12 }, (_, index) => block(`focus-${index}`));
    expect(normalizeDailyPlan(stored({ blocks: many }))?.blocks.length).toBeLessThanOrEqual(6);
  });
});
