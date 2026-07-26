// Untrusted-input normalization for a stored daily plan, following the same
// posture as the rest of the data contract: validate, drop anything malformed,
// and never let a stored value be trusted before it passes through here.

import { isCompetencyId } from "../curriculum/competencies";
import {
  DAILY_PLAN_VERSION,
  type DailyBlockRole,
  type DailyPlan,
  type DailyPlanBlock,
  type PlanActivity,
} from "./dailyPlan";

const ROLES = new Set<string>(["focus", "review", "confidence"]);
const ACTIVITIES = new Set<string>(["reading", "pitch", "songs"]);
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BLOCKS = 6;

function normalizeBlock(value: unknown): DailyPlanBlock | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== "string" || candidate.id.length === 0) return undefined;
  if (!ROLES.has(candidate.role as string) || !ACTIVITIES.has(candidate.activity as string)) return undefined;
  if (typeof candidate.title !== "string" || typeof candidate.reason !== "string") return undefined;
  if (typeof candidate.estimatedSeconds !== "number" || !Number.isFinite(candidate.estimatedSeconds)) return undefined;
  if (candidate.estimatedSeconds <= 0) return undefined;

  const block: DailyPlanBlock = {
    id: candidate.id.slice(0, 60),
    role: candidate.role as DailyBlockRole,
    activity: candidate.activity as PlanActivity,
    title: candidate.title.slice(0, 60),
    reason: candidate.reason.slice(0, 200),
    estimatedSeconds: Math.round(candidate.estimatedSeconds),
  };
  if (isCompetencyId(candidate.competencyId)) block.competencyId = candidate.competencyId;
  return block;
}

export function normalizeDailyPlan(value: unknown): DailyPlan | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;

  if (candidate.planVersion !== DAILY_PLAN_VERSION) return undefined;
  if (typeof candidate.localDate !== "string" || !LOCAL_DATE.test(candidate.localDate)) return undefined;
  if (typeof candidate.generatedAtIso !== "string" || Number.isNaN(Date.parse(candidate.generatedAtIso))) {
    return undefined;
  }
  if (!Array.isArray(candidate.blocks)) return undefined;

  const blocks = candidate.blocks
    .slice(0, MAX_BLOCKS)
    .map(normalizeBlock)
    .filter((block): block is DailyPlanBlock => block !== undefined);
  if (blocks.length === 0) return undefined;

  const blockIds = new Set(blocks.map((block) => block.id));
  const completedBlockIds = Array.isArray(candidate.completedBlockIds)
    ? [...new Set(candidate.completedBlockIds.filter((id): id is string => typeof id === "string" && blockIds.has(id)))]
    : [];

  const curriculumVersion =
    typeof candidate.curriculumVersion === "number" && Number.isInteger(candidate.curriculumVersion)
      ? candidate.curriculumVersion
      : 1;

  const plan: DailyPlan = {
    planVersion: DAILY_PLAN_VERSION,
    localDate: candidate.localDate,
    curriculumVersion,
    generatedAtIso: candidate.generatedAtIso,
    estimatedSeconds: blocks.reduce((total, block) => total + block.estimatedSeconds, 0),
    blocks,
    completedBlockIds,
  };
  if (typeof candidate.activeBlockId === "string" && blockIds.has(candidate.activeBlockId)) {
    plan.activeBlockId = candidate.activeBlockId;
  }
  return plan;
}
