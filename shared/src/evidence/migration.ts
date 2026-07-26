// Migration from the legacy aggregate counters (PracticeProgress.noteStats) into
// the event ledger.
//
// Old counters record only attempts and correct counts per note. They contain no
// timing, no per-attempt dates, and no prompt context, so fabricating normal
// attempt events from them would invent evidence that never existed. Instead we
// emit ONE low-confidence summary event per note, marked source
// "legacy-summary", with no response time. Downstream, these give a gentle
// starting hint and are excluded from calibrated scores.

import { type CompetencyId } from "../curriculum/competencies";
import { type PracticeProgress } from "../types";
import { ATTEMPT_EVENT_SCHEMA_VERSION, type AttemptEvent } from "./attemptEvent";

export const LEGACY_MIGRATION_VERSION = 1;
export const LEGACY_DEVICE_ID = "legacy-import";
export const LEGACY_SESSION_ID = "legacy-summary";

const MODE_COMPETENCY: Record<"reading" | "pitch", CompetencyId> = {
  reading: "reading.pitch.staff-to-key",
  pitch: "ear.pitch.absolute-anchor",
};

// Converts legacy per-note counters into inferred summary events. Deterministic:
// the same progress and `migratedAt` always produce the same events, so running
// the migration twice is idempotent (event ids are stable and dedupe on union).
export function migrateLegacyProgress(progress: PracticeProgress, migratedAt: Date): AttemptEvent[] {
  const answeredAtIso = migratedAt.toISOString();
  const events: AttemptEvent[] = [];
  let sequence = 0;

  for (const mode of ["reading", "pitch"] as const) {
    const noteStats = progress[mode]?.noteStats ?? {};
    for (const noteId of Object.keys(noteStats).sort()) {
      const stat = noteStats[noteId];
      if (!stat || stat.attempts <= 0) continue;

      const accuracy = Math.min(1, Math.max(0, stat.correct / stat.attempts));
      sequence += 1;
      events.push({
        schemaVersion: ATTEMPT_EVENT_SCHEMA_VERSION,
        eventId: `legacy-${mode}-${noteId}`,
        deviceId: LEGACY_DEVICE_ID,
        deviceSequence: sequence,
        sessionId: LEGACY_SESSION_ID,
        exercise: { id: `legacy-${mode}`, version: 1, generatorVersion: 1 },
        promptId: noteId,
        // No per-attempt dates existed, so start and answer times are the
        // migration instant and responseMs stays 0 rather than being invented.
        startedAtIso: answeredAtIso,
        answeredAtIso,
        responseMs: 0,
        inputSource: "unknown",
        result: {
          correct: accuracy >= 0.5,
          totalScore: accuracy,
          components: {},
          mistakeCodes: [],
        },
        competencyEvidence: [
          {
            competencyId: MODE_COMPETENCY[mode],
            dimensions: {},
            correct: accuracy >= 0.5,
            // Summarised evidence counts for less than a real attempt.
            weight: 0.5,
          },
        ],
        versions: { scoringVersion: 1, curriculumVersion: 1, skillMappingVersion: 1, transportVersion: 1 },
        source: "legacy-summary",
      });
    }
  }

  return events;
}
