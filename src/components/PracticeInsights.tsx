import { formatDuration } from "../practiceEngine";
import type { PracticeInsightSummary } from "../types";

type PracticeInsightsProps = {
  modeLabel: string;
  summary: PracticeInsightSummary;
};

const CHART_WIDTH = 280;
const CHART_HEIGHT = 96;
const CHART_PADDING = 14;

function formatDelta(delta: number) {
  if (delta === 0) {
    return "0%";
  }

  return `${delta > 0 ? "+" : ""}${delta}%`;
}

function getTrendPointCoordinates(summary: PracticeInsightSummary) {
  const drawableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const drawableHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const pointCount = summary.trendPoints.length;

  return summary.trendPoints.map((point, index) => {
    const x =
      pointCount === 1 ? CHART_WIDTH / 2 : CHART_PADDING + (index / Math.max(pointCount - 1, 1)) * drawableWidth;
    const y = CHART_PADDING + (1 - point.accuracy / 100) * drawableHeight;

    return { ...point, x, y };
  });
}

function PracticeInsights({ modeLabel, summary }: PracticeInsightsProps) {
  const coordinates = getTrendPointCoordinates(summary);
  const trendPath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const deltaTone = summary.accuracyDelta > 0 ? "positive" : summary.accuracyDelta < 0 ? "negative" : "neutral";
  const chartLabel =
    coordinates.length === 0
      ? `${modeLabel} has no saved trend data yet.`
      : `${modeLabel} accuracy trend across ${coordinates.length} saved rounds, latest ${summary.latestAccuracy} percent.`;

  return (
    <div className="insights-card" aria-labelledby="insights-title">
      <h3 id="insights-title">Practice insight</h3>
      {coordinates.length === 0 ? (
        <p className="empty-state">Finish a round and NoteSense will chart the recent trend.</p>
      ) : (
        <>
          <div className="insight-metrics" aria-label={`${modeLabel} trend metrics`}>
            <div>
              <span>Latest</span>
              <strong>{summary.latestAccuracy}%</strong>
            </div>
            <div>
              <span>Change</span>
              <strong className={deltaTone}>{formatDelta(summary.accuracyDelta)}</strong>
            </div>
            <div>
              <span>Best streak</span>
              <strong>{summary.bestStreak}</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{formatDuration(summary.totalPracticeSeconds)}</strong>
            </div>
          </div>

          <svg
            className="trend-chart"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label={chartLabel}
          >
            <line
              className="trend-gridline"
              x1={CHART_PADDING}
              x2={CHART_WIDTH - CHART_PADDING}
              y1={CHART_PADDING}
              y2={CHART_PADDING}
            />
            <line
              className="trend-gridline"
              x1={CHART_PADDING}
              x2={CHART_WIDTH - CHART_PADDING}
              y1={CHART_HEIGHT - CHART_PADDING}
              y2={CHART_HEIGHT - CHART_PADDING}
            />
            {coordinates.length > 1 && <path className="trend-line" d={trendPath} />}
            {coordinates.map((point) => (
              <circle key={point.id} className="trend-point" cx={point.x} cy={point.y} r="4.5" />
            ))}
          </svg>
        </>
      )}
    </div>
  );
}

export default PracticeInsights;
