// Bounded read models derived from the event stream, for UI that needs a quick
// answer without walking the whole ledger. These are caches: dropping them and
// rebuilding from events must produce the same values, so they are never the
// record of truth.

import { type AttemptEvent } from "./attemptEvent";

// A UI-sized window of recent attempts. The full ledger stays in the event
// store; this is only what a screen needs to render.
export const RECENT_ATTEMPTS_LIMIT = 50;

export type RecentAttempt = {
  eventId: string;
  answeredAtIso: string;
  exerciseId: string;
  correct: boolean;
  responseMs: number;
  mistakeCodes: string[];
};

export type SessionRollup = {
  sessionId: string;
  startedAtIso: string;
  endedAtIso: string;
  attempts: number;
  correct: number;
  accuracy: number;
  totalResponseMs: number;
};

// Newest-first window of live attempts. Inferred legacy summaries are excluded:
// they are not real attempts and would misrepresent recent activity.
export function recentAttempts(events: readonly AttemptEvent[], limit = RECENT_ATTEMPTS_LIMIT): RecentAttempt[] {
  return events
    .filter((event) => event.source === "live")
    .slice()
    .sort((a, b) => Date.parse(b.answeredAtIso) - Date.parse(a.answeredAtIso))
    .slice(0, Math.max(0, limit))
    .map((event) => ({
      eventId: event.eventId,
      answeredAtIso: event.answeredAtIso,
      exerciseId: event.exercise.id,
      correct: event.result.correct,
      responseMs: event.responseMs,
      mistakeCodes: event.result.mistakeCodes,
    }));
}

// Per-session totals, oldest session first.
export function sessionRollups(events: readonly AttemptEvent[]): SessionRollup[] {
  const bySession = new Map<string, SessionRollup>();

  for (const event of events) {
    if (event.source !== "live") continue;
    const existing = bySession.get(event.sessionId);
    if (!existing) {
      bySession.set(event.sessionId, {
        sessionId: event.sessionId,
        startedAtIso: event.startedAtIso,
        endedAtIso: event.answeredAtIso,
        attempts: 1,
        correct: event.result.correct ? 1 : 0,
        accuracy: event.result.correct ? 1 : 0,
        totalResponseMs: event.responseMs,
      });
      continue;
    }
    existing.attempts += 1;
    if (event.result.correct) existing.correct += 1;
    existing.accuracy = existing.correct / existing.attempts;
    existing.totalResponseMs += event.responseMs;
    if (Date.parse(event.startedAtIso) < Date.parse(existing.startedAtIso)) existing.startedAtIso = event.startedAtIso;
    if (Date.parse(event.answeredAtIso) > Date.parse(existing.endedAtIso)) existing.endedAtIso = event.answeredAtIso;
  }

  return [...bySession.values()].sort((a, b) => Date.parse(a.startedAtIso) - Date.parse(b.startedAtIso));
}
