import type { MixSegment, MixSegmentRole } from "../types";

type DailyMixCardProps = {
  segment: MixSegment;
  isComplete: boolean;
  onStart: (segment: MixSegment) => void;
};

const ROLE_LABEL: Record<MixSegmentRole, string> = {
  weakness: "Weak spot",
  review: "Review",
  reward: "For fun",
};

function formatMinutes(seconds: number): string {
  return `~${Math.max(1, Math.round(seconds / 60))} min`;
}

function DailyMixCard({ segment, isComplete, onStart }: DailyMixCardProps) {
  return (
    <article className={`daily-mix-card ${isComplete ? "complete" : ""}`} data-role={segment.role}>
      <div className="daily-mix-body">
        <span className={`daily-mix-role role-${segment.role}`}>{ROLE_LABEL[segment.role]}</span>
        <h3>{segment.title}</h3>
        <p className="daily-mix-detail">{segment.detail}</p>
        <span className="daily-mix-meta">{formatMinutes(segment.estimatedSeconds)}</span>
      </div>
      {isComplete ? (
        <span className="daily-mix-done">Done</span>
      ) : (
        <button
          className="primary-button"
          type="button"
          aria-label={`Start ${segment.title}`}
          onClick={() => onStart(segment)}
        >
          Start
        </button>
      )}
    </article>
  );
}

export default DailyMixCard;
