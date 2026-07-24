import DailyGoal from "./DailyGoal";
import DailyMixCard from "./DailyMixCard";
import type { DailyGoalSummary, DailyMix, MixSegment } from "../types";
import "./today.css";

type TodayWorkspaceProps = {
  mix: DailyMix | null;
  dailyGoalSummary: DailyGoalSummary;
  onStartSegment: (segment: MixSegment) => void;
  onRegenerate: () => void;
};

function TodayWorkspace({ mix, dailyGoalSummary, onStartSegment, onRegenerate }: TodayWorkspaceProps) {
  const completedCount = mix
    ? mix.segments.filter((segment) => mix.completedSegmentIds.includes(segment.id)).length
    : 0;
  const allComplete = mix !== null && completedCount === mix.segments.length;

  return (
    <section className="practice-panel today-panel" aria-label="Today">
      <div className="today-header">
        <div>
          <h2>Today</h2>
          <p className="today-subtitle">
            {mix ? `Your daily mix — ${completedCount}/${mix.segments.length} done` : "Building your daily mix…"}
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onRegenerate} disabled={mix === null}>
          Shuffle mix
        </button>
      </div>

      <DailyGoal summary={dailyGoalSummary} />

      <ul className="daily-mix-list" aria-label="Daily mix">
        {mix === null && <li className="daily-mix-loading">Preparing your exercises…</li>}
        {mix?.segments.map((segment) => (
          <li key={segment.id}>
            <DailyMixCard
              segment={segment}
              isComplete={mix.completedSegmentIds.includes(segment.id)}
              onStart={onStartSegment}
            />
          </li>
        ))}
      </ul>

      {allComplete && (
        <p className="today-complete" role="status">
          Daily mix complete — nice work. Come back tomorrow for a fresh set.
        </p>
      )}
    </section>
  );
}

export default TodayWorkspace;
