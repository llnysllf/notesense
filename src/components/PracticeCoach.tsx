import type { PracticeMode, PracticePlan } from "../types";

type PracticeCoachProps = {
  mode: PracticeMode;
  modeLabel: string;
  plan: PracticePlan;
};

function PracticeCoach({ mode, modeLabel, plan }: PracticeCoachProps) {
  const titleId = `practice-coach-${mode}`;

  return (
    <div className={`coach-card ${plan.tone}`} aria-labelledby={titleId}>
      <div className="coach-heading">
        <div>
          <span>Practice plan</span>
          <h3 id={titleId}>{plan.title}</h3>
        </div>
        <em>{plan.focus}</em>
      </div>

      <p>{plan.reason}</p>

      <div className="coach-target">
        <span>Target</span>
        <strong>{plan.target}</strong>
      </div>

      <ol className="coach-steps" aria-label={`${modeLabel} practice plan`}>
        {plan.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

export default PracticeCoach;
