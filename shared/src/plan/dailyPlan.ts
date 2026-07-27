// The daily plan: a short, finite set of blocks a learner can finish today.
//
// The plan is a *consumer* of the curriculum catalog and the evidence engine —
// it has no scoring or mastery logic of its own. It is pure and deterministic
// for a learner and a local date, so it can be regenerated offline and produces
// the same plan on every device until the day, curriculum, or plan shape
// changes.

import type { CompetencyId } from "../curriculum/competencies";
import { selectCompetencies, type SelectionCandidate } from "../evidence/scheduler";
import type { MasterySnapshot } from "../evidence/mastery";

// Bumped when the plan shape or the planning rules change, so stored plans from
// an older planner are regenerated rather than misread.
// Version 2 waits for the evidence ledger before caching a new plan. Bumping
// invalidates v1 plans that may have been generated before that ledger loaded.
export const DAILY_PLAN_VERSION = 2;

// Every block trains one thing, and the learner is told which and why.
export type DailyBlockRole = "focus" | "review" | "confidence";

// The activities that actually ship today. A block is never planned for an
// activity the app cannot run, so the plan never promises an empty screen.
export type PlanActivity = "reading" | "pitch" | "songs";

export type DailyPlanBlock = {
  id: string;
  role: DailyBlockRole;
  activity: PlanActivity;
  title: string;
  // Plain language, shown to the learner: why this block is here today.
  reason: string;
  estimatedSeconds: number;
  competencyId?: CompetencyId;
};

export type DailyPlan = {
  planVersion: number;
  // Local calendar date, not UTC: a plan belongs to the learner's day.
  localDate: string;
  curriculumVersion: number;
  generatedAtIso: string;
  estimatedSeconds: number;
  blocks: DailyPlanBlock[];
  completedBlockIds: string[];
  // The block the learner opened most recently. A block is only credited when
  // its activity actually finishes, so starting one has to be remembered across
  // the trip to the drill and back.
  activeBlockId?: string;
};

// Which activity trains a competency. Only competencies with a shipped activity
// can be planned.
const ACTIVITY_BY_COMPETENCY: Partial<Record<CompetencyId, PlanActivity>> = {
  "reading.pitch.staff-to-key": "reading",
  "reading.pitch.key-to-staff": "reading",
  "reading.interval.horizontal": "reading",
  "ear.pitch.absolute-anchor": "pitch",
  "ear.interval.melodic": "pitch",
};

export const PLANNABLE_COMPETENCIES = Object.keys(ACTIVITY_BY_COMPETENCY) as CompetencyId[];

const BLOCK_SECONDS = 180;
const CONFIDENCE_SECONDS = 120;
const ROLE_TITLES: Record<DailyBlockRole, string> = {
  focus: "Focus",
  review: "Review",
  confidence: "Play something",
};

// The learner's local calendar date as YYYY-MM-DD. Uses local time on purpose:
// a plan should roll over at the learner's midnight, not at UTC midnight.
export function localDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activityFor(competencyId: CompetencyId): PlanActivity | undefined {
  return ACTIVITY_BY_COMPETENCY[competencyId];
}

function blockFromCandidate(
  candidate: SelectionCandidate,
  role: DailyBlockRole,
  index: number,
): DailyPlanBlock | undefined {
  const activity = activityFor(candidate.competencyId);
  if (!activity) return undefined;

  return {
    id: `${role}-${index}`,
    role,
    activity,
    title: ROLE_TITLES[role],
    reason: candidate.explanation,
    estimatedSeconds: BLOCK_SECONDS,
    competencyId: candidate.competencyId,
  };
}

export type PlanOptions = {
  snapshot: MasterySnapshot;
  now: Date;
  // Minutes the learner said they have. The plan never exceeds it.
  availableMinutes?: number;
};

// Builds today's plan. Deterministic for a given local date and snapshot.
export function planDay({ snapshot, now, availableMinutes = 10 }: PlanOptions): DailyPlan {
  const localDate = localDateKey(now);
  const budgetSeconds = Math.max(BLOCK_SECONDS, Math.round(availableMinutes * 60));

  const ranked = selectCompetencies({
    snapshot,
    available: PLANNABLE_COMPETENCIES,
    now,
    // Seeding on the date keeps the plan stable all day and fresh tomorrow.
    seed: localDate,
    limit: PLANNABLE_COMPETENCIES.length,
  });

  const blocks: DailyPlanBlock[] = [];
  const usedCompetencies = new Set<CompetencyId>();
  const activityCounts = new Map<PlanActivity, number>();

  const canAdd = (block: DailyPlanBlock) => {
    // Never fill the whole plan with one activity, even when the evidence
    // points that way: variety is what keeps a daily habit tolerable.
    const count = activityCounts.get(block.activity) ?? 0;
    if (count >= 2) return false;
    return blocks.reduce((total, entry) => total + entry.estimatedSeconds, 0) + block.estimatedSeconds <= budgetSeconds;
  };

  const push = (block: DailyPlanBlock) => {
    blocks.push(block);
    activityCounts.set(block.activity, (activityCounts.get(block.activity) ?? 0) + 1);
    if (block.competencyId) usedCompetencies.add(block.competencyId);
  };

  // A due review comes first when one exists. The next best distinct activity is
  // still a Focus block even when it too is due: a daily plan needs a finite
  // review/focus/confidence shape, not a checklist of identically labelled work.
  const dueFirst = [...ranked].sort((a, b) => Number(b.reason === "due-review") - Number(a.reason === "due-review"));

  const reviewCandidate = dueFirst.find((candidate) => candidate.reason === "due-review");
  if (reviewCandidate) {
    const review = blockFromCandidate(reviewCandidate, "review", blocks.length);
    if (review && canAdd(review)) push(review);
  }

  const focusCandidate = dueFirst.find((candidate) => !usedCompetencies.has(candidate.competencyId));
  if (focusCandidate) {
    const focus = blockFromCandidate(focusCandidate, "focus", blocks.length);
    if (focus && canAdd(focus)) push(focus);
  }

  // Something enjoyable to end on. Songs need no evidence, so this also covers
  // a brand-new learner with an empty snapshot.
  const confidence: DailyPlanBlock = {
    id: `confidence-${blocks.length}`,
    role: "confidence",
    activity: "songs",
    title: ROLE_TITLES.confidence,
    reason: "Finish with a song you enjoy.",
    estimatedSeconds: CONFIDENCE_SECONDS,
  };
  if (canAdd(confidence)) push(confidence);

  // A plan with nothing in it would be a dead end, so always offer a start.
  if (blocks.length === 0) {
    push({
      id: "focus-0",
      role: "focus",
      activity: "reading",
      title: ROLE_TITLES.focus,
      reason: "Start with a short reading warm-up.",
      estimatedSeconds: BLOCK_SECONDS,
    });
  }

  return {
    planVersion: DAILY_PLAN_VERSION,
    localDate,
    curriculumVersion: 1,
    generatedAtIso: now.toISOString(),
    estimatedSeconds: blocks.reduce((total, block) => total + block.estimatedSeconds, 0),
    blocks,
    completedBlockIds: [],
  };
}

// Records which block the learner opened, so the matching activity can be
// credited when it finishes.
export function startBlock(plan: DailyPlan, blockId: string): DailyPlan {
  if (!plan.blocks.some((block) => block.id === blockId)) return plan;
  return { ...plan, activeBlockId: blockId };
}

// Credits the open block once its activity reports completion. Returns the plan
// unchanged when nothing is open or a different activity finished, so a drill
// the learner started on their own never ticks off a block they skipped.
export function completeActiveBlock(plan: DailyPlan, activity: PlanActivity): DailyPlan {
  const active = plan.blocks.find((block) => block.id === plan.activeBlockId);
  if (!active || active.activity !== activity) return plan;

  const credited = markBlockComplete(plan, active.id);
  if (credited === plan) return plan;

  // Clear the open block once credited so it cannot be credited twice.
  const cleared: DailyPlan = { ...credited };
  delete cleared.activeBlockId;
  return cleared;
}

// A stored plan is stale once the day rolls over, the planner changes, or the
// curriculum it was built against changes.
export function isPlanStale(plan: DailyPlan, options: { now: Date; curriculumVersion?: number }): boolean {
  if (plan.planVersion !== DAILY_PLAN_VERSION) return true;
  if (plan.localDate !== localDateKey(options.now)) return true;
  return plan.curriculumVersion !== (options.curriculumVersion ?? 1);
}

export type PlanProgress = {
  completed: number;
  total: number;
  remainingSeconds: number;
  isComplete: boolean;
};

export function planProgress(plan: DailyPlan): PlanProgress {
  const done = new Set(plan.completedBlockIds);
  const completed = plan.blocks.filter((block) => done.has(block.id)).length;
  const remainingSeconds = plan.blocks
    .filter((block) => !done.has(block.id))
    .reduce((total, block) => total + block.estimatedSeconds, 0);

  return { completed, total: plan.blocks.length, remainingSeconds, isComplete: completed === plan.blocks.length };
}

// Marking a block done is idempotent, so returning to Today after finishing a
// drill cannot double-count it.
export function markBlockComplete(plan: DailyPlan, blockId: string): DailyPlan {
  if (!plan.blocks.some((block) => block.id === blockId)) return plan;
  if (plan.completedBlockIds.includes(blockId)) return plan;

  return { ...plan, completedBlockIds: [...plan.completedBlockIds, blockId] };
}
