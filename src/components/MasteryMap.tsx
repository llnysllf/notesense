import type { MasteryItem, MasteryStatus, MasterySummary, PracticeMode } from "../types";

type MasteryMapProps = {
  mode: PracticeMode;
  modeLabel: string;
  summary: MasterySummary;
};

const masteryLabels: Record<MasteryStatus, string> = {
  new: "New",
  learning: "Learning",
  focus: "Focus",
  strong: "Strong",
};

function getItemAriaLabel(item: MasteryItem) {
  if (item.attempts === 0) {
    return `${item.label} ${masteryLabels[item.status]}, no attempts yet`;
  }

  return `${item.label} ${masteryLabels[item.status]}, ${item.accuracy}% accuracy across ${item.attempts} attempt${
    item.attempts === 1 ? "" : "s"
  }`;
}

function MasteryMap({ mode, modeLabel, summary }: MasteryMapProps) {
  const titleId = `mastery-map-${mode}`;
  const completion = summary.totalCount > 0 ? Math.round((summary.strongCount / summary.totalCount) * 100) : 0;

  return (
    <div className="mastery-card" aria-labelledby={titleId}>
      <div className="mastery-heading">
        <div>
          <h3 id={titleId}>Mastery map</h3>
          <p>
            {summary.strongCount === 0
              ? "Build a few strong notes to unlock a clearer path."
              : `${summary.strongCount} strong out of ${summary.totalCount}.`}
          </p>
        </div>
        <strong>{summary.averageAccuracy}%</strong>
      </div>

      <div className="mastery-progress" aria-hidden="true">
        <span style={{ width: `${completion}%` }} />
      </div>

      <ul className="mastery-grid" aria-label={`${modeLabel} mastery map`}>
        {summary.items.map((item) => (
          <li key={item.id} className={item.status} aria-label={getItemAriaLabel(item)}>
            <strong>{item.label}</strong>
            <span>{masteryLabels[item.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MasteryMap;
