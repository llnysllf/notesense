import { buildMasterySnapshot, recentAttempts, sessionRollups, type AttemptEvent } from "../types";

const KEY = "notesense.evidence.projections.v1";

export type EvidenceProjections = {
  mastery: ReturnType<typeof buildMasterySnapshot>;
  recentAttempts: ReturnType<typeof recentAttempts>;
  sessionRollups: ReturnType<typeof sessionRollups>;
};

export function rebuildEvidenceProjections(events: readonly AttemptEvent[], now = new Date()): EvidenceProjections {
  return {
    mastery: buildMasterySnapshot(events, now),
    recentAttempts: recentAttempts(events),
    sessionRollups: sessionRollups(events),
  };
}

export function saveEvidenceProjections(projections: EvidenceProjections): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(projections));
    return true;
  } catch {
    return false;
  }
}

export function loadEvidenceProjections(): EvidenceProjections | null {
  try {
    const parsed = localStorage.getItem(KEY);
    return parsed ? (JSON.parse(parsed) as EvidenceProjections) : null;
  } catch {
    return null;
  }
}
