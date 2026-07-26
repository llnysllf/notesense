// The immutable attempt event: the durable record of one answered prompt, and
// the load-bearing contract every later feature produces and consumes.
//
// Design rules that keep this safe to evolve:
// - Stable and versioned, not frozen. Algorithm/catalog versions travel with the
//   event so projections can be recomputed after any of them change.
// - Idempotent by eventId, so an upload can be retried without double counting.
// - Reconstructable: an event carries enough context to rebuild every projection
//   from scratch. Derived voice summaries only; raw audio and pitch frames are
//   never persisted.
// - Legacy evidence is marked inferred and carries no invented timing.

import { normalizeDimensions, type Dimensions } from "../curriculum/dimensions";
import { isCompetencyId, type CompetencyId } from "../curriculum/competencies";
import { normalizeUserAnswer, type UserAnswer } from "../exercises/answer";

export const ATTEMPT_EVENT_SCHEMA_VERSION = 1;

export type EvidenceSource = "live" | "legacy-summary";

export type AttemptInputSource = "touch" | "computer-keyboard" | "midi" | "microphone" | "unknown";

// Which algorithm and catalog versions produced this event. Recorded per event
// so a later algorithm can recompute mastery from the same evidence.
export type AttemptVersions = {
  scoringVersion: number;
  curriculumVersion: number;
  skillMappingVersion: number;
  transportVersion: number;
};

export type CompetencyEvidence = {
  competencyId: CompetencyId;
  dimensions: Dimensions;
  correct: boolean;
  weight: number; // 0..1 share of this attempt attributable to the competency
};

export type AttemptResult = {
  correct: boolean;
  totalScore: number; // 0..1
  components: { pitch?: number; rhythm?: number; continuity?: number; fluency?: number };
  mistakeCodes: string[];
};

export type AttemptEvent = {
  schemaVersion: number;
  eventId: string; // globally unique; the idempotency key
  deviceId: string;
  deviceSequence: number; // monotonic per device, for ordering within a device
  userId?: string;
  sessionId: string;
  exercise: { id: string; version: number; generatorVersion: number; seed?: string };
  promptId: string;
  startedAtIso: string; // wall clock: dates, ordering, sync metadata only
  answeredAtIso: string;
  responseMs: number; // measured on the audio/performance clock
  inputSource: AttemptInputSource;
  answer?: UserAnswer; // absent for inferred legacy evidence
  result: AttemptResult;
  competencyEvidence: CompetencyEvidence[];
  versions: AttemptVersions;
  source: EvidenceSource;
  receivedAtIso?: string; // set by the server on acceptance, never by the client
};

const INPUT_SOURCES = new Set<string>(["touch", "computer-keyboard", "midi", "microphone", "unknown"]);

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function clampUnit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function normalizeVersions(value: unknown): AttemptVersions {
  const candidate = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    scoringVersion: positiveInt(candidate.scoringVersion, 1),
    curriculumVersion: positiveInt(candidate.curriculumVersion, 1),
    skillMappingVersion: positiveInt(candidate.skillMappingVersion, 1),
    transportVersion: positiveInt(candidate.transportVersion, 1),
  };
}

function normalizeResult(value: unknown): AttemptResult {
  const candidate = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const rawComponents =
    typeof candidate.components === "object" && candidate.components !== null
      ? (candidate.components as Record<string, unknown>)
      : {};
  const components: AttemptResult["components"] = {};
  for (const key of ["pitch", "rhythm", "continuity", "fluency"] as const) {
    if (typeof rawComponents[key] === "number" && Number.isFinite(rawComponents[key])) {
      components[key] = clampUnit(rawComponents[key]);
    }
  }
  return {
    correct: candidate.correct === true,
    totalScore: clampUnit(candidate.totalScore),
    components,
    mistakeCodes: Array.isArray(candidate.mistakeCodes)
      ? candidate.mistakeCodes.filter((code): code is string => typeof code === "string" && code.length > 0)
      : [],
  };
}

function normalizeCompetencyEvidence(value: unknown): CompetencyEvidence[] {
  if (!Array.isArray(value)) return [];
  const evidence: CompetencyEvidence[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    if (!isCompetencyId(candidate.competencyId)) continue;
    evidence.push({
      competencyId: candidate.competencyId,
      dimensions: normalizeDimensions(candidate.dimensions),
      correct: candidate.correct === true,
      weight: typeof candidate.weight === "number" ? clampUnit(candidate.weight) : 1,
    });
  }
  return evidence;
}

// Normalizes an untrusted attempt-event-shaped value. Returns null when the
// event lacks the identity or timing needed to be durable evidence.
export function normalizeAttemptEvent(value: unknown): AttemptEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;

  const eventId = typeof candidate.eventId === "string" ? candidate.eventId.trim() : "";
  const deviceId = typeof candidate.deviceId === "string" ? candidate.deviceId.trim() : "";
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId.trim() : "";
  const promptId = typeof candidate.promptId === "string" ? candidate.promptId.trim() : "";
  if (!eventId || !deviceId || !sessionId || !promptId) return null;

  const exerciseRaw =
    typeof candidate.exercise === "object" && candidate.exercise !== null
      ? (candidate.exercise as Record<string, unknown>)
      : undefined;
  const exerciseId = typeof exerciseRaw?.id === "string" ? exerciseRaw.id.trim() : "";
  if (!exerciseId) return null;

  if (!isIsoDate(candidate.answeredAtIso)) return null;
  const source: EvidenceSource = candidate.source === "legacy-summary" ? "legacy-summary" : "live";
  // Inferred legacy evidence must not carry invented start times or latency.
  const startedAtIso = isIsoDate(candidate.startedAtIso) ? candidate.startedAtIso : candidate.answeredAtIso;
  const responseMs =
    source === "legacy-summary"
      ? 0
      : typeof candidate.responseMs === "number" && Number.isFinite(candidate.responseMs) && candidate.responseMs >= 0
        ? Math.round(candidate.responseMs)
        : 0;

  const event: AttemptEvent = {
    schemaVersion: ATTEMPT_EVENT_SCHEMA_VERSION,
    eventId,
    deviceId,
    deviceSequence:
      typeof candidate.deviceSequence === "number" ? Math.max(0, Math.round(candidate.deviceSequence)) : 0,
    sessionId,
    exercise: {
      id: exerciseId,
      version: positiveInt(exerciseRaw?.version, 1),
      generatorVersion: positiveInt(exerciseRaw?.generatorVersion, 1),
    },
    promptId,
    startedAtIso,
    answeredAtIso: candidate.answeredAtIso,
    responseMs,
    inputSource: INPUT_SOURCES.has(candidate.inputSource as string)
      ? (candidate.inputSource as AttemptInputSource)
      : "unknown",
    result: normalizeResult(candidate.result),
    competencyEvidence: normalizeCompetencyEvidence(candidate.competencyEvidence),
    versions: normalizeVersions(candidate.versions),
    source,
  };

  if (typeof exerciseRaw?.seed === "string" && exerciseRaw.seed.length > 0) event.exercise.seed = exerciseRaw.seed;
  if (typeof candidate.userId === "string" && candidate.userId.trim().length > 0)
    event.userId = candidate.userId.trim();
  // Legacy summaries carry no answer; live events keep only a structured one.
  if (source === "live") {
    const answer = normalizeUserAnswer(candidate.answer);
    if (answer) event.answer = answer;
  }

  return event;
}

// Deduplicates by eventId, keeping the first occurrence, then orders by answered
// time with device/sequence as a stable tie-break. Union is idempotent: merging
// the same events repeatedly never changes the result.
export function unionAttemptEvents(...batches: readonly (readonly AttemptEvent[])[]): AttemptEvent[] {
  const byId = new Map<string, AttemptEvent>();
  for (const batch of batches) {
    for (const event of batch) {
      const existing = byId.get(event.eventId);
      if (!existing) {
        byId.set(event.eventId, event);
        continue;
      }
      // A duplicate id must denote the same immutable event.  Picking whichever
      // replica arrived first made a two-device union order-dependent, so use a
      // stable representation as the deterministic conflict tie-breaker.
      const existingEncoded = JSON.stringify(existing);
      const incomingEncoded = JSON.stringify(event);
      if (incomingEncoded < existingEncoded) byId.set(event.eventId, event);
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      Date.parse(a.answeredAtIso) - Date.parse(b.answeredAtIso) ||
      a.deviceId.localeCompare(b.deviceId) ||
      a.deviceSequence - b.deviceSequence,
  );
}
