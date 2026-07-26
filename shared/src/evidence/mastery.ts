// Mastery snapshots derived from the attempt-event stream. Snapshots are a
// cache, never the source of truth: rebuilding from events must reproduce them
// exactly, so a future algorithm can recompute history rather than migrate it.
//
// The first algorithm is deliberately simple and is NOT presented as calibrated:
// recency-weighted accuracy, a fluency signal, and a confidence value driven by
// how much and how varied the evidence is.

import { type CompetencyId } from "../curriculum/competencies";
import { type AttemptEvent } from "./attemptEvent";

export const MASTERY_ALGORITHM_VERSION = 1;

// Evidence older than this contributes progressively less.
const HALF_LIFE_DAYS = 14;
// Attempts needed before confidence approaches its ceiling.
const CONFIDENCE_TARGET_ATTEMPTS = 12;
// A response at or under this is treated as fully fluent.
const FLUENT_MS = 2500;

export type CompetencyMastery = {
  competencyId: CompetencyId;
  attempts: number;
  accuracy: number; // 0..1, recency weighted
  fluency: number; // 0..1, faster answers score higher
  confidence: number; // 0..1, how much this estimate should be trusted
  lastPracticedAtIso?: string;
  // Attempts that came from inferred legacy summaries. Surfaced so callers can
  // label a starting hint rather than present it as measured evidence.
  inferredAttempts: number;
};

export type MasterySnapshot = {
  algorithmVersion: number;
  generatedAtIso: string;
  // The newest event included, so a snapshot can be extended incrementally.
  throughEventId?: string;
  competencies: Record<string, CompetencyMastery>;
};

function decayWeight(eventIso: string, nowMs: number): number {
  const ageDays = Math.max(0, (nowMs - Date.parse(eventIso)) / 86_400_000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function fluencyScore(responseMs: number): number {
  if (responseMs <= 0) return 0;
  if (responseMs <= FLUENT_MS) return 1;
  return Math.max(0, Math.min(1, FLUENT_MS / responseMs));
}

// Builds a mastery snapshot from an event stream. Pure and deterministic: the
// same events and `now` always produce the same snapshot.
export function buildMasterySnapshot(events: readonly AttemptEvent[], now: Date): MasterySnapshot {
  const nowMs = now.getTime();
  type Acc = {
    weightedCorrect: number;
    weight: number;
    attempts: number;
    inferred: number;
    fluencyWeighted: number;
    fluencyWeight: number;
    last?: string;
    dimensionKeys: Set<string>;
  };
  const accumulators = new Map<CompetencyId, Acc>();

  for (const event of events) {
    const recency = decayWeight(event.answeredAtIso, nowMs);
    for (const evidence of event.competencyEvidence) {
      const acc = accumulators.get(evidence.competencyId) ?? {
        weightedCorrect: 0,
        weight: 0,
        attempts: 0,
        inferred: 0,
        fluencyWeighted: 0,
        fluencyWeight: 0,
        dimensionKeys: new Set<string>(),
      };

      acc.attempts += 1;
      if (event.source === "legacy-summary") {
        // Legacy aggregates are a label-only starting hint.  They contain no
        // real timestamps or individual outcomes, so they never affect a
        // calibrated score, recency, fluency, or scheduling.
        acc.inferred += 1;
        accumulators.set(evidence.competencyId, acc);
        continue;
      }

      const weight = recency * evidence.weight;
      acc.weight += weight;
      if (evidence.correct) acc.weightedCorrect += weight;

      // Inferred evidence has no real timing, so it never feeds fluency.
      if (event.source === "live" && event.responseMs > 0) {
        acc.fluencyWeighted += fluencyScore(event.responseMs) * weight;
        acc.fluencyWeight += weight;
      }
      acc.dimensionKeys.add(JSON.stringify(evidence.dimensions));
      if (!acc.last || Date.parse(event.answeredAtIso) > Date.parse(acc.last)) acc.last = event.answeredAtIso;

      accumulators.set(evidence.competencyId, acc);
    }
  }

  const competencies: Record<string, CompetencyMastery> = {};
  for (const [competencyId, acc] of accumulators) {
    // Confidence grows with evidence volume and with variety of conditions, and
    // is discounted when the evidence is mostly inferred.
    const volume = Math.min(1, acc.attempts / CONFIDENCE_TARGET_ATTEMPTS);
    const variety = Math.min(1, acc.dimensionKeys.size / 3);
    const measuredShare = acc.attempts === 0 ? 0 : (acc.attempts - acc.inferred) / acc.attempts;
    competencies[competencyId] = {
      competencyId,
      attempts: acc.attempts,
      accuracy: acc.weight === 0 ? 0 : acc.weightedCorrect / acc.weight,
      fluency: acc.fluencyWeight === 0 ? 0 : acc.fluencyWeighted / acc.fluencyWeight,
      confidence: volume * (0.6 + 0.4 * variety) * (0.5 + 0.5 * measuredShare),
      ...(acc.last ? { lastPracticedAtIso: acc.last } : {}),
      inferredAttempts: acc.inferred,
    };
  }

  const snapshot: MasterySnapshot = {
    algorithmVersion: MASTERY_ALGORITHM_VERSION,
    generatedAtIso: now.toISOString(),
    competencies,
  };
  const newest = events.reduce<AttemptEvent | undefined>(
    (current, candidate) =>
      !current || Date.parse(candidate.answeredAtIso) > Date.parse(current.answeredAtIso)
        ? candidate
        : Date.parse(candidate.answeredAtIso) === Date.parse(current.answeredAtIso) &&
            candidate.eventId > current.eventId
          ? candidate
          : current,
    undefined,
  );
  if (newest) snapshot.throughEventId = newest.eventId;
  return snapshot;
}
