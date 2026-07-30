import { Link } from "raviger";
import { routeForSection } from "../routes";
import type { DailyPlan, DailyPlanBlock, PlanProgress } from "../types";

// Today: one short, finite plan the learner can actually finish. Each block says
// what it trains and why it is here, so the plan is explainable rather than a
// black box, and finishing it is a real end point rather than an endless feed.

const ROLE_LABELS: Record<DailyPlanBlock["role"], string> = {
  focus: "Focus",
  review: "Review",
  confidence: "Enjoy",
};

function blockHref(block: DailyPlanBlock): string {
  if (block.activity === "songs") return routeForSection("songs").path;
  return routeForSection("practice", block.activity === "pitch" ? "pitch" : "reading").path;
}

function formatMinutes(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

type TodayWorkspaceProps = {
  plan: DailyPlan;
  progress: PlanProgress;
  onOpenBlock: (blockId: string) => void;
};

function TodayWorkspace({ plan, progress, onOpenBlock }: TodayWorkspaceProps) {
  const completed = new Set(plan.completedBlockIds);

  return (
    <section className="practice-panel today-panel" aria-labelledby="today-heading">
      <p className="eyebrow">Today</p>
      <h2 id="today-heading">Your plan for today</h2>

      {progress.isComplete ? (
        <p className="today-summary" role="status">
          Plan complete. Anything more today is a bonus.
        </p>
      ) : (
        <p className="today-summary">
          {progress.completed} of {progress.total} done · about {formatMinutes(progress.remainingSeconds)} left
        </p>
      )}

      <ol className="today-blocks">
        {plan.blocks.map((block) => {
          const isDone = completed.has(block.id);
          return (
            <li key={block.id} className={`today-block ${isDone ? "done" : ""}`}>
              <div className="today-block-head">
                <span className={`today-role role-${block.role}`}>{ROLE_LABELS[block.role]}</span>
                <span className="today-time">{formatMinutes(block.estimatedSeconds)}</span>
              </div>
              <p className="today-reason">{block.reason}</p>
              {isDone ? (
                <p className="today-done">Done</p>
              ) : (
                <Link href={blockHref(block)} className="today-start" onClick={() => onOpenBlock(block.id)}>
                  Start
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default TodayWorkspace;
