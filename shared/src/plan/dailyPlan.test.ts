import { describe, expect, it } from "vitest";
import { buildMasterySnapshot } from "../evidence/mastery";
import type { AttemptEvent } from "../evidence/attemptEvent";
import {
  completeActiveBlock,
  DAILY_PLAN_VERSION,
  isPlanStale,
  localDateKey,
  markBlockComplete,
  planDay,
  planProgress,
  PLANNABLE_COMPETENCIES,
  startBlock,
  type DailyPlan,
} from "./dailyPlan";

const NOW = new Date("2026-05-14T09:00:00.000Z");
const emptySnapshot = (now = NOW) => buildMasterySnapshot([], now);

const attempt = (competencyId: string, correct: boolean, atIso: string, index: number): AttemptEvent => ({
  schemaVersion: 1,
  eventId: `e-${competencyId}-${index}`,
  deviceId: "device",
  deviceSequence: index,
  sessionId: "session",
  exercise: { id: "ex", version: 1, generatorVersion: 1 },
  promptId: `p-${index}`,
  startedAtIso: atIso,
  answeredAtIso: atIso,
  responseMs: 1200,
  inputSource: "touch",
  answer: { kind: "pitch", midi: 60 },
  result: { correct, totalScore: correct ? 1 : 0, components: {}, mistakeCodes: [] },
  competencyEvidence: [{ competencyId: competencyId as never, dimensions: {}, correct, weight: 1 }],
  versions: { scoringVersion: 1, curriculumVersion: 1, skillMappingVersion: 1, transportVersion: 1 },
  source: "live",
});

describe("planDay", () => {
  it("builds a short, finite plan with a reason for every block", () => {
    const plan = planDay({ snapshot: emptySnapshot(), now: NOW });

    expect(plan.planVersion).toBe(DAILY_PLAN_VERSION);
    expect(plan.localDate).toBe(localDateKey(NOW));
    expect(plan.blocks.length).toBeGreaterThan(0);
    expect(plan.blocks.length).toBeLessThanOrEqual(3);
    expect(plan.completedBlockIds).toEqual([]);
    for (const block of plan.blocks) {
      expect(block.reason.length).toBeGreaterThan(0);
      expect(block.estimatedSeconds).toBeGreaterThan(0);
    }
    expect(plan.estimatedSeconds).toBe(plan.blocks.reduce((total, block) => total + block.estimatedSeconds, 0));
  });

  it("is deterministic for the same day and evidence", () => {
    const first = planDay({ snapshot: emptySnapshot(), now: NOW });
    const second = planDay({ snapshot: emptySnapshot(), now: NOW });

    expect(second.blocks).toEqual(first.blocks);
  });

  it("only plans activities that actually ship", () => {
    const plan = planDay({ snapshot: emptySnapshot(), now: NOW });

    for (const block of plan.blocks) {
      expect(["reading", "pitch", "songs"]).toContain(block.activity);
      if (block.competencyId) expect(PLANNABLE_COMPETENCIES).toContain(block.competencyId);
    }
  });

  it("always offers something to a brand-new learner", () => {
    const plan = planDay({ snapshot: emptySnapshot(), now: NOW });

    expect(plan.blocks.length).toBeGreaterThan(0);
    expect(plan.blocks.some((block) => block.role === "confidence")).toBe(true);
  });

  it("never exceeds the time the learner has", () => {
    const plan = planDay({ snapshot: emptySnapshot(), now: NOW, availableMinutes: 4 });

    expect(plan.estimatedSeconds).toBeLessThanOrEqual(4 * 60);
    expect(plan.blocks.length).toBeGreaterThan(0);
  });

  it("does not fill the plan with a single activity", () => {
    const plan = planDay({ snapshot: emptySnapshot(), now: NOW });
    const counts = new Map<string, number>();
    for (const block of plan.blocks) counts.set(block.activity, (counts.get(block.activity) ?? 0) + 1);

    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it("leads with a review once material is due", () => {
    // Three correct answers spaces the next review 7 days out; it is now 13
    // days later, so this competency is due rather than new.
    const events = Array.from({ length: 3 }, (_, index) =>
      attempt("reading.pitch.staff-to-key", true, "2026-05-01T09:00:00.000Z", index),
    );
    const plan = planDay({ snapshot: buildMasterySnapshot(events, NOW), now: NOW });

    expect(plan.blocks[0]?.role).toBe("review");
  });

  it("keeps a focus block when more than one competency is due", () => {
    const events = [
      ...Array.from({ length: 3 }, (_, index) =>
        attempt("reading.pitch.staff-to-key", true, "2026-05-01T09:00:00.000Z", index),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        attempt("ear.pitch.absolute-anchor", true, "2026-05-01T09:00:00.000Z", index + 3),
      ),
    ];

    const plan = planDay({ snapshot: buildMasterySnapshot(events, NOW), now: NOW });

    expect(plan.blocks.map((block) => block.role)).toEqual(["review", "focus", "confidence"]);
  });
});

describe("isPlanStale", () => {
  const plan = planDay({ snapshot: emptySnapshot(), now: NOW });

  it("is fresh on the same local day", () => {
    expect(isPlanStale(plan, { now: new Date(NOW.getTime() + 60_000) })).toBe(false);
  });

  it("goes stale when the day rolls over", () => {
    const tomorrow = new Date(NOW.getTime() + 24 * 3600 * 1000);
    expect(isPlanStale(plan, { now: tomorrow })).toBe(true);
  });

  it("goes stale when the planner or curriculum changes", () => {
    expect(isPlanStale({ ...plan, planVersion: 0 }, { now: NOW })).toBe(true);
    expect(isPlanStale(plan, { now: NOW, curriculumVersion: 2 })).toBe(true);
  });
});

describe("progress and completion", () => {
  const plan = planDay({ snapshot: emptySnapshot(), now: NOW });
  const firstId = plan.blocks[0]?.id as string;

  it("reports progress and remaining time", () => {
    expect(planProgress(plan)).toMatchObject({ completed: 0, total: plan.blocks.length, isComplete: false });

    const done = markBlockComplete(plan, firstId);
    const progress = planProgress(done);
    expect(progress.completed).toBe(1);
    expect(progress.remainingSeconds).toBeLessThan(plan.estimatedSeconds);
  });

  it("ignores unknown blocks and never double-counts", () => {
    const once = markBlockComplete(plan, firstId);
    expect(markBlockComplete(once, firstId)).toBe(once);
    expect(markBlockComplete(plan, "nope")).toBe(plan);
  });

  it("reports a finished plan as complete", () => {
    const all = plan.blocks.reduce<DailyPlan>((current, block) => markBlockComplete(current, block.id), plan);
    expect(planProgress(all)).toMatchObject({ isComplete: true, remainingSeconds: 0 });
  });
});

describe("startBlock / completeActiveBlock", () => {
  const plan = planDay({ snapshot: emptySnapshot(), now: NOW });
  const readingBlock = plan.blocks.find((block) => block.activity === "reading");
  const songBlock = plan.blocks.find((block) => block.activity === "songs");

  it("remembers which block was opened", () => {
    const opened = startBlock(plan, plan.blocks[0]?.id as string);
    expect(opened.activeBlockId).toBe(plan.blocks[0]?.id);
    expect(startBlock(plan, "nope")).toBe(plan);
  });

  it("credits the open block only when its own activity finishes", () => {
    if (!readingBlock || !songBlock) return;

    const opened = startBlock(plan, readingBlock.id);
    // Finishing a different activity must not tick off the open block.
    expect(completeActiveBlock(opened, "songs")).toBe(opened);

    const credited = completeActiveBlock(opened, "reading");
    expect(credited.completedBlockIds).toContain(readingBlock.id);
    // The block is closed once credited, so it cannot be credited twice.
    expect(credited.activeBlockId).toBeUndefined();
    expect(completeActiveBlock(credited, "reading")).toBe(credited);
  });

  it("does nothing when no block is open", () => {
    expect(completeActiveBlock(plan, "reading")).toBe(plan);
  });
});

describe("localDateKey", () => {
  it("formats the learner's local calendar date", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31, 0, 5))).toBe("2026-12-31");
  });
});
