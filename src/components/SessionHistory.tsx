import { formatDuration } from "../practiceEngine";
import type { SessionHistorySummary } from "../types";

type SessionHistoryProps = {
  modeLabel: string;
  summary: SessionHistorySummary;
};

const sessionDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatSessionDate(completedAt: string) {
  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) {
    return "Saved session";
  }

  return sessionDateFormatter.format(date);
}

function SessionHistory({ modeLabel, summary }: SessionHistoryProps) {
  return (
    <div className="history-card" aria-labelledby="history-title">
      <h3 id="history-title">Practice history</h3>
      {summary.recentSessions.length === 0 ? (
        <p className="empty-state">Finish a round and recent sessions will appear here.</p>
      ) : (
        <>
          <div className="history-metrics" aria-label="Recent practice summary">
            <div>
              <span>Recent avg</span>
              <strong>{summary.averageAccuracy}%</strong>
            </div>
            <div>
              <span>Practice time</span>
              <strong>{formatDuration(summary.totalPracticeSeconds)}</strong>
            </div>
          </div>
          <ol className="history-list" aria-label={`${modeLabel} recent sessions`}>
            {summary.recentSessions.map((session) => (
              <li
                key={session.id}
                aria-label={`${modeLabel} session ${session.score} out of ${session.attempts}, ${session.accuracy}% accuracy`}
              >
                <div className="history-copy">
                  <strong>
                    {session.score}/{session.attempts}
                  </strong>
                  <span>{formatSessionDate(session.completedAt)}</span>
                </div>
                <div className="history-meter" aria-hidden="true">
                  <span style={{ width: `${session.accuracy}%` }} />
                </div>
                <em>{session.accuracy}%</em>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export default SessionHistory;
