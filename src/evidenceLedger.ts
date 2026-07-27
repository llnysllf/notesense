import {
  migrateLegacyProgress,
  normalizeAttemptEvent,
  unionAttemptEvents,
  type AttemptEvent,
  type CompetencyId,
  type PracticeProgress,
} from "./types";
import { appendAttemptEvent, loadAttemptEvents, replaceAttemptEvents } from "./storage/eventStore";
import { rebuildEvidenceProjections, saveEvidenceProjections } from "./storage/projectionsStore";

const DEVICE_ID_KEY = "notesense.evidence.device-id.v1";
const DEVICE_SEQUENCE_KEY = "notesense.evidence.device-sequence.v1";
const LEGACY_MIGRATED_KEY = "notesense.evidence.legacy-migrated.v1";
let ephemeralDeviceId: string | null = null;
let ephemeralSequence = 0;

function newId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stableDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = newId("device");
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    ephemeralDeviceId ??= newId("device");
    return ephemeralDeviceId;
  }
}

function nextSequence(): number {
  try {
    const sequence = Number(localStorage.getItem(DEVICE_SEQUENCE_KEY) ?? "0") + 1;
    localStorage.setItem(DEVICE_SEQUENCE_KEY, String(sequence));
    return sequence;
  } catch {
    ephemeralSequence += 1;
    return ephemeralSequence;
  }
}

export async function initializeEvidenceLedger(progress: PracticeProgress): Promise<AttemptEvent[]> {
  try {
    const existing = await loadAttemptEvents();
    let events = existing;
    if (!localStorage.getItem(LEGACY_MIGRATED_KEY)) {
      // The migration timestamp is bookkeeping only; legacy events are excluded
      // from calibrated recency and scores by the shared mastery algorithm.
      const migrated = migrateLegacyProgress(progress, new Date());
      await Promise.all(migrated.map(appendAttemptEvent));
      localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
      events = unionAttemptEvents(existing, migrated);
    }
    saveEvidenceProjections(rebuildEvidenceProjections(events));
    return events;
  } catch {
    // Storage may be disabled by private browsing or quota policy.  Evidence is
    // supplementary to the current attempt and must not create an unhandled
    // rejection or disrupt practice.
    return [];
  }
}

export async function recordEvidenceAttempt(event: AttemptEvent): Promise<void> {
  if (!(await appendAttemptEvent(event))) return;
  const events = await loadAttemptEvents();
  saveEvidenceProjections(rebuildEvidenceProjections(events));
}

export async function exportEvidenceEvents(): Promise<AttemptEvent[]> {
  return loadAttemptEvents();
}

export async function importEvidenceEvents(rawEvents: unknown[]): Promise<boolean> {
  const incoming = rawEvents.map(normalizeAttemptEvent).filter((event): event is AttemptEvent => event !== null);
  const merged = unionAttemptEvents(await loadAttemptEvents(), incoming);
  const saved = await replaceAttemptEvents(merged);
  if (saved) saveEvidenceProjections(rebuildEvidenceProjections(merged));
  return saved;
}

export function createLiveAttemptEvent(options: {
  sessionId: string;
  exerciseId: string;
  promptId: string;
  startedAtIso: string;
  answeredAtIso: string;
  responseMs: number;
  competencyId: CompetencyId;
  correct: boolean;
  answerMidi?: number;
}): AttemptEvent {
  return {
    schemaVersion: 1,
    eventId: newId("event"),
    deviceId: stableDeviceId(),
    deviceSequence: nextSequence(),
    sessionId: options.sessionId,
    exercise: { id: options.exerciseId, version: 1, generatorVersion: 1 },
    promptId: options.promptId,
    startedAtIso: options.startedAtIso,
    answeredAtIso: options.answeredAtIso,
    responseMs: Math.max(0, Math.round(options.responseMs)),
    inputSource: "touch",
    ...(options.answerMidi === undefined ? {} : { answer: { kind: "pitch" as const, midi: options.answerMidi } }),
    result: {
      correct: options.correct,
      totalScore: options.correct ? 1 : 0,
      components: { pitch: options.correct ? 1 : 0 },
      mistakeCodes: options.correct ? [] : ["incorrect-answer"],
    },
    competencyEvidence: [{ competencyId: options.competencyId, dimensions: {}, correct: options.correct, weight: 1 }],
    versions: { scoringVersion: 1, curriculumVersion: 1, skillMappingVersion: 1, transportVersion: 1 },
    source: "live",
  };
}
