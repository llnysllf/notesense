// Spaced review and adaptive selection over mastery snapshots.
//
// Selection is deterministic (seeded) and explainable: every choice comes with a
// plain-language reason, because a learner should be able to understand why an
// exercise was chosen. It deliberately does not drill only the single weakest
// item; variety and prerequisite readiness are part of the score.

import { type CompetencyId } from "../curriculum/competencies";
import { isReady } from "../curriculum/prerequisites";
import { createRng } from "../exercises/seededRng";
import { type CompetencyMastery, type MasterySnapshot } from "./mastery";

export const SCHEDULER_VERSION = 1;

// Review spacing by consecutive-success count, in days.
const REVIEW_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35];
const MASTERED_ACCURACY = 0.85;
const MASTERED_CONFIDENCE = 0.5;

export type SelectionReason =
  "due-review" | "low-mastery" | "low-confidence" | "recent-mistake" | "new-material" | "variety";

export type SelectionCandidate = {
  competencyId: CompetencyId;
  score: number;
  reason: SelectionReason;
  explanation: string;
};

// When a competency is next due, based on how well it is currently known.
export function nextReviewDueIso(mastery: CompetencyMastery): string {
  const step = mastery.accuracy >= MASTERED_ACCURACY ? Math.min(mastery.attempts, REVIEW_INTERVALS_DAYS.length - 1) : 1;
  const days = REVIEW_INTERVALS_DAYS[step] ?? 1;
  return new Date(Date.parse(mastery.lastPracticedAtIso) + days * 86_400_000).toISOString();
}

export function isDue(mastery: CompetencyMastery, now: Date): boolean {
  return Date.parse(nextReviewDueIso(mastery)) <= now.getTime();
}

// Treated as known well enough to stop prioritising, but not "finished".
export function isMastered(mastery: CompetencyMastery): boolean {
  return mastery.accuracy >= MASTERED_ACCURACY && mastery.confidence >= MASTERED_CONFIDENCE;
}

const EXPLANATIONS: Record<SelectionReason, string> = {
  "due-review": "Reviewing this because it has become less certain since you last practised it.",
  "low-mastery": "Practising this because recent answers here have been shaky.",
  "low-confidence": "Practising this because there is not much evidence about it yet.",
  "recent-mistake": "Revisiting this because of a recent mistake.",
  "new-material": "Introducing this because you are ready for it and have not practised it yet.",
  variety: "Mixing this in so the session does not repeat the same thing.",
};

function scoreCompetency(
  mastery: CompetencyMastery | undefined,
  now: Date,
): { score: number; reason: SelectionReason } {
  if (!mastery) return { score: 0.55, reason: "new-material" };
  if (isDue(mastery, now)) return { score: 0.7 + 0.3 * (1 - mastery.accuracy), reason: "due-review" };
  if (mastery.accuracy < 0.6) return { score: 0.6 + 0.3 * (1 - mastery.accuracy), reason: "low-mastery" };
  if (mastery.confidence < 0.4) return { score: 0.5 + 0.2 * (1 - mastery.confidence), reason: "low-confidence" };
  return { score: 0.2 * (1 - mastery.accuracy), reason: "variety" };
}

// Ranks candidate competencies. Deterministic for a given seed, snapshot, and
// `now`; the seeded jitter only breaks ties so sessions are not identical.
export function selectCompetencies(options: {
  snapshot: MasterySnapshot;
  available: readonly CompetencyId[];
  now: Date;
  seed: string;
  limit?: number;
}): SelectionCandidate[] {
  const { snapshot, available, now, seed, limit = 3 } = options;
  const rng = createRng(`selection:${seed}`);

  const mastered = new Set<CompetencyId>(
    Object.values(snapshot.competencies)
      .filter(isMastered)
      .map((entry) => entry.competencyId),
  );

  const candidates: SelectionCandidate[] = [];
  for (const competencyId of available) {
    // Do not introduce material whose prerequisites are not yet in place.
    const mastery = snapshot.competencies[competencyId];
    if (!mastery && !isReady(competencyId, mastered)) continue;

    const { score, reason } = scoreCompetency(mastery, now);
    candidates.push({
      competencyId,
      score: score + rng() * 0.02, // tie-break jitter only
      reason,
      explanation: EXPLANATIONS[reason],
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.competencyId.localeCompare(b.competencyId))
    .slice(0, Math.max(0, limit));
}
