import { formatDuration } from "../practiceEngine";
import type { DailyGoalSummary } from "../types";

type DailyGoalProps = {
  summary: DailyGoalSummary;
};

function formatDayCount(count: number) {
  return `${count} day${count === 1 ? "" : "s"}`;
}

function DailyGoal({ summary }: DailyGoalProps) {
  return (
    <div className={`daily-goal-card ${summary.isComplete ? "complete" : ""}`} aria-labelledby="daily-goal-title">
      <div className="daily-goal-heading">
        <div>
          <h3 id="daily-goal-title">Daily goal</h3>
          <p>{summary.nextAction}</p>
        </div>
        <strong>
          {summary.completedSessions}/{summary.targetSessions}
          <span> round{summary.targetSessions === 1 ? "" : "s"}</span>
        </strong>
      </div>

      <div
        className="daily-goal-progress"
        role="meter"
        aria-label="Daily practice goal progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.completionPercent}
      >
        <span style={{ width: `${summary.completionPercent}%` }} />
      </div>

      <div className="daily-goal-metrics" aria-label="Daily practice goal metrics">
        <div>
          <span>Today</span>
          <strong>{formatDuration(summary.todayPracticeSeconds)}</strong>
        </div>
        <div>
          <span>Streak</span>
          <strong>{formatDayCount(summary.currentStreak)}</strong>
        </div>
        <div>
          <span>Best</span>
          <strong>{formatDayCount(summary.bestStreak)}</strong>
        </div>
      </div>
    </div>
  );
}

export default DailyGoal;
