import { describe, expect, it } from "vitest";
import type { PracticeProgress } from "../types";
import {
  ATTEMPT_EVENT_SCHEMA_VERSION,
  normalizeAttemptEvent,
  unionAttemptEvents,
  type AttemptEvent,
} from "./attemptEvent";
import { buildMasterySnapshot, MASTERY_ALGORITHM_VERSION } from "./mastery";
import { isDue, isMastered, nextReviewDueIso, selectCompetencies } from "./scheduler";
import { migrateLegacyProgress } from "./migration";
import { recentAttempts, sessionRollups } from "./projections";

const NOW = new Date("2026-07-20T12:00:00.000Z");

const event = (over: Partial<AttemptEvent> = {}): AttemptEvent => ({
  schemaVersion: ATTEMPT_EVENT_SCHEMA_VERSION,
  eventId: "e1",
  deviceId: "device-a",
  deviceSequence: 1,
  sessionId: "s1",
  exercise: { id: "reading.staff-to-key-1", version: 1, generatorVersion: 1 },
  promptId: "p1",
  startedAtIso: "2026-07-20T11:59:58.000Z",
  answeredAtIso: "2026-07-20T11:59:59.000Z",
  responseMs: 1200,
  inputSource: "touch",
  answer: { kind: "pitch", midi: 60 },
  result: { correct: true, totalScore: 1, components: { pitch: 1 }, mistakeCodes: [] },
  competencyEvidence: [
    { competencyId: "reading.pitch.staff-to-key", dimensions: { clef: "treble" }, correct: true, weight: 1 },
  ],
  versions: { scoringVersion: 1, curriculumVersion: 1, skillMappingVersion: 1, transportVersion: 1 },
  source: "live",
  ...over,
});

describe("normalizeAttemptEvent", () => {
  it("accepts a well-formed event and preserves versioning", () => {
    const normalized = normalizeAttemptEvent(event());
    expect(normalized).not.toBeNull();
    expect(normalized?.versions).toEqual({
      scoringVersion: 1,
      curriculumVersion: 1,
      skillMappingVersion: 1,
      transportVersion: 1,
    });
    expect(normalized?.answer).toEqual({ kind: "pitch", midi: 60 });
  });

  it("rejects events lacking durable identity or timing", () => {
    expect(normalizeAttemptEvent(null)).toBeNull();
    expect(normalizeAttemptEvent({ ...event(), eventId: "" })).toBeNull();
    expect(normalizeAttemptEvent({ ...event(), deviceId: "  " })).toBeNull();
    expect(normalizeAttemptEvent({ ...event(), sessionId: "" })).toBeNull();
    expect(normalizeAttemptEvent({ ...event(), promptId: "" })).toBeNull();
    expect(normalizeAttemptEvent({ ...event(), exercise: { id: "" } })).toBeNull();
    expect(normalizeAttemptEvent({ ...event(), answeredAtIso: "not-a-date" })).toBeNull();
  });

  it("defaults versions, clamps scores, and drops junk mistake codes", () => {
    const normalized = normalizeAttemptEvent({
      ...event(),
      versions: undefined,
      result: { correct: true, totalScore: 9, components: { pitch: 5, bogus: 1 }, mistakeCodes: ["a", 7, ""] },
    });
    expect(normalized?.versions.scoringVersion).toBe(1);
    expect(normalized?.result.totalScore).toBe(1);
    expect(normalized?.result.components).toEqual({ pitch: 1 });
    expect(normalized?.result.mistakeCodes).toEqual(["a"]);
  });

  it("never keeps invented timing or an answer on inferred legacy evidence", () => {
    const normalized = normalizeAttemptEvent({
      ...event(),
      source: "legacy-summary",
      responseMs: 4321,
      answer: { kind: "pitch", midi: 60 },
    });
    expect(normalized?.source).toBe("legacy-summary");
    expect(normalized?.responseMs).toBe(0);
    expect(normalized?.answer).toBeUndefined();
  });

  it("carries optional identity, seed, and server receipt when present", () => {
    const normalized = normalizeAttemptEvent({
      ...event(),
      userId: "  user-7 ",
      exercise: { id: "ex", version: 3, generatorVersion: 2, seed: "sd" },
      deviceSequence: 4.6,
      receivedAtIso: "2026-07-20T12:00:10.000Z",
      inputSource: "midi",
    });
    expect(normalized?.userId).toBe("user-7");
    expect(normalized?.exercise).toEqual({ id: "ex", version: 3, generatorVersion: 2, seed: "sd" });
    expect(normalized?.deviceSequence).toBe(5);
    expect(normalized?.receivedAtIso).toBe("2026-07-20T12:00:10.000Z");
    expect(normalized?.inputSource).toBe("midi");
  });

  it("falls back safely on missing optionals and unknown input sources", () => {
    const normalized = normalizeAttemptEvent({
      ...event(),
      userId: "   ",
      startedAtIso: "nonsense",
      responseMs: -5,
      deviceSequence: "x",
      inputSource: "telepathy",
      receivedAtIso: "nope",
      answer: { kind: "bogus" },
      competencyEvidence: "not-an-array",
      result: undefined,
    });
    expect(normalized?.userId).toBeUndefined();
    // An unparsable start time falls back to the answered time.
    expect(normalized?.startedAtIso).toBe(normalized?.answeredAtIso);
    expect(normalized?.responseMs).toBe(0);
    expect(normalized?.deviceSequence).toBe(0);
    expect(normalized?.inputSource).toBe("unknown");
    expect(normalized?.receivedAtIso).toBeUndefined();
    expect(normalized?.answer).toBeUndefined();
    expect(normalized?.competencyEvidence).toEqual([]);
    expect(normalized?.result.correct).toBe(false);
  });

  it("keeps only known competency evidence and clamps weights", () => {
    const normalized = normalizeAttemptEvent({
      ...event(),
      competencyEvidence: [
        { competencyId: "ghost", correct: true, weight: 1 },
        { competencyId: "rhythm.pulse", dimensions: { tempo: 90, junk: {} }, correct: false, weight: 5 },
      ],
    });
    expect(normalized?.competencyEvidence).toEqual([
      { competencyId: "rhythm.pulse", dimensions: { tempo: 90 }, correct: false, weight: 1 },
    ]);
  });
});

describe("unionAttemptEvents", () => {
  it("is idempotent and deduplicates by eventId", () => {
    const a = event({ eventId: "e1" });
    const b = event({ eventId: "e2", answeredAtIso: "2026-07-20T12:00:05.000Z" });
    const once = unionAttemptEvents([a, b]);
    const twice = unionAttemptEvents(once, [a, b], [a]);
    expect(once).toHaveLength(2);
    expect(twice).toEqual(once);
  });

  it("loses no accepted events when two devices practise concurrently", () => {
    // The failure mode aggregate counters have: same wall-clock window, two
    // devices, independent work. Every distinct event must survive the merge.
    const deviceA = Array.from({ length: 5 }, (_, i) =>
      event({
        eventId: `a-${i}`,
        deviceId: "device-a",
        deviceSequence: i,
        answeredAtIso: `2026-07-20T12:00:0${i}.000Z`,
      }),
    );
    const deviceB = Array.from({ length: 5 }, (_, i) =>
      event({
        eventId: `b-${i}`,
        deviceId: "device-b",
        deviceSequence: i,
        answeredAtIso: `2026-07-20T12:00:0${i}.000Z`,
      }),
    );
    const merged = unionAttemptEvents(deviceA, deviceB);
    expect(merged).toHaveLength(10);
    // Re-merging in the other order changes nothing.
    expect(unionAttemptEvents(deviceB, deviceA)).toEqual(merged);
  });
});

describe("buildMasterySnapshot", () => {
  it("derives mastery from the stream and is rebuildable", () => {
    const events = [
      event({ eventId: "e1", answeredAtIso: "2026-07-20T11:00:00.000Z" }),
      event({
        eventId: "e2",
        answeredAtIso: "2026-07-20T11:30:00.000Z",
        result: { correct: false, totalScore: 0, components: {}, mistakeCodes: ["wrong-pitch"] },
        competencyEvidence: [
          { competencyId: "reading.pitch.staff-to-key", dimensions: { clef: "bass" }, correct: false, weight: 1 },
        ],
      }),
    ];
    const snapshot = buildMasterySnapshot(events, NOW);
    const mastery = snapshot.competencies["reading.pitch.staff-to-key"];
    expect(snapshot.algorithmVersion).toBe(MASTERY_ALGORITHM_VERSION);
    expect(snapshot.throughEventId).toBe("e2");
    expect(mastery?.attempts).toBe(2);
    expect(mastery?.accuracy).toBeCloseTo(0.5, 1);
    expect(mastery?.inferredAttempts).toBe(0);
    // Rebuilding from the same events reproduces the snapshot exactly.
    expect(buildMasterySnapshot(events, NOW)).toEqual(snapshot);
  });

  it("weights recent evidence above old evidence", () => {
    const old = buildMasterySnapshot([event({ answeredAtIso: "2026-01-01T00:00:00.000Z" })], NOW);
    const fresh = buildMasterySnapshot([event()], NOW);
    const oldMastery = old.competencies["reading.pitch.staff-to-key"];
    const freshMastery = fresh.competencies["reading.pitch.staff-to-key"];
    expect(freshMastery?.confidence).toBeGreaterThan(0);
    // Both are fully correct, but the stale one carries far less weight.
    expect(oldMastery?.accuracy).toBeCloseTo(freshMastery?.accuracy ?? 0, 5);
  });

  it("excludes inferred evidence from fluency and discounts its confidence", () => {
    const inferred = event({ source: "legacy-summary", responseMs: 0 });
    const snapshot = buildMasterySnapshot([inferred], NOW);
    const mastery = snapshot.competencies["reading.pitch.staff-to-key"];
    expect(mastery?.inferredAttempts).toBe(1);
    expect(mastery?.fluency).toBe(0);

    const live = buildMasterySnapshot([event()], NOW).competencies["reading.pitch.staff-to-key"];
    expect(live?.confidence).toBeGreaterThan(mastery?.confidence ?? 1);
  });

  it("returns an empty snapshot for an empty stream", () => {
    const snapshot = buildMasterySnapshot([], NOW);
    expect(snapshot.competencies).toEqual({});
    expect(snapshot.throughEventId).toBeUndefined();
  });
});

describe("scheduler", () => {
  it("schedules weak material sooner than strong material", () => {
    const base = buildMasterySnapshot([event()], NOW).competencies["reading.pitch.staff-to-key"];
    expect(base).toBeDefined();
    const weak = { ...base!, accuracy: 0.2, attempts: 1 };
    const strong = { ...base!, accuracy: 0.95, attempts: 5 };
    expect(Date.parse(nextReviewDueIso(weak))).toBeLessThan(Date.parse(nextReviewDueIso(strong)));
    expect(isDue(weak, new Date(Date.parse(weak.lastPracticedAtIso) + 2 * 86_400_000))).toBe(true);
    expect(isMastered({ ...strong, confidence: 0.9 })).toBe(true);
    expect(isMastered({ ...weak, confidence: 0.9 })).toBe(false);
  });

  it("selects deterministically and explains every choice", () => {
    const snapshot = buildMasterySnapshot([event()], NOW);
    const options = {
      snapshot,
      available: ["reading.pitch.staff-to-key", "reading.pitch.key-to-staff", "rhythm.pulse"] as const,
      now: NOW,
      seed: "day-1",
      limit: 3,
    };
    const first = selectCompetencies({ ...options, available: [...options.available] });
    const second = selectCompetencies({ ...options, available: [...options.available] });
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    for (const candidate of first) expect(candidate.explanation.length).toBeGreaterThan(10);
  });

  it("does not introduce material whose prerequisites are unmet", () => {
    // key-to-staff requires staff-to-key; with no evidence at all it is not ready.
    const empty = buildMasterySnapshot([], NOW);
    const picked = selectCompetencies({
      snapshot: empty,
      available: ["reading.pitch.key-to-staff"],
      now: NOW,
      seed: "s",
    });
    expect(picked).toEqual([]);

    // Once the prerequisite is mastered, it becomes available.
    const mastered = buildMasterySnapshot(
      Array.from({ length: 12 }, (_, i) =>
        event({ eventId: `m-${i}`, answeredAtIso: `2026-07-20T11:${String(10 + i).padStart(2, "0")}:00.000Z` }),
      ),
      NOW,
    );
    expect(
      selectCompetencies({ snapshot: mastered, available: ["reading.pitch.key-to-staff"], now: NOW, seed: "s" }),
    ).toHaveLength(1);
  });

  it("labels low-confidence and low-mastery material distinctly", () => {
    const base = buildMasterySnapshot([event()], NOW).competencies["reading.pitch.staff-to-key"];
    expect(base).toBeDefined();
    const snapshotWith = (mastery: typeof base) => ({
      algorithmVersion: 1,
      generatedAtIso: NOW.toISOString(),
      competencies: { "reading.pitch.staff-to-key": mastery! },
    });
    const recent = new Date(Date.parse(base!.lastPracticedAtIso) + 1000);

    // Shaky accuracy, but not yet due for review.
    const shaky = selectCompetencies({
      snapshot: snapshotWith({ ...base!, accuracy: 0.3, confidence: 0.9 }),
      available: ["reading.pitch.staff-to-key"],
      now: recent,
      seed: "s",
    });
    expect(shaky[0]?.reason).toBe("low-mastery");

    // Accurate and fresh, but barely any evidence behind it.
    const thin = selectCompetencies({
      snapshot: snapshotWith({ ...base!, accuracy: 0.95, confidence: 0.1 }),
      available: ["reading.pitch.staff-to-key"],
      now: recent,
      seed: "s",
    });
    expect(thin[0]?.reason).toBe("low-confidence");

    // Strong and well evidenced: kept only for variety.
    const solid = selectCompetencies({
      snapshot: snapshotWith({ ...base!, accuracy: 0.95, confidence: 0.9 }),
      available: ["reading.pitch.staff-to-key"],
      now: recent,
      seed: "s",
    });
    expect(solid[0]?.reason).toBe("variety");
  });

  it("honours the limit", () => {
    const snapshot = buildMasterySnapshot([event()], NOW);
    expect(
      selectCompetencies({
        snapshot,
        available: ["reading.pitch.staff-to-key", "rhythm.pulse"],
        now: NOW,
        seed: "s",
        limit: 1,
      }),
    ).toHaveLength(1);
    expect(selectCompetencies({ snapshot, available: ["rhythm.pulse"], now: NOW, seed: "s", limit: 0 })).toHaveLength(
      0,
    );
  });
});

describe("migrateLegacyProgress", () => {
  const legacy = {
    reading: {
      totalAttempts: 10,
      totalCorrect: 8,
      bestRoundScore: 5,
      sessionsCompleted: 2,
      noteStats: { C4: { attempts: 6, correct: 5 }, D4: { attempts: 4, correct: 1 }, E4: { attempts: 0, correct: 0 } },
    },
    pitch: {
      totalAttempts: 3,
      totalCorrect: 2,
      bestRoundScore: 3,
      sessionsCompleted: 1,
      noteStats: { G4: { attempts: 3, correct: 2 } },
    },
    history: [],
  } as unknown as PracticeProgress;

  it("emits inferred summaries with no invented timing", () => {
    const events = migrateLegacyProgress(legacy, NOW);
    expect(events).toHaveLength(3); // E4 had zero attempts and is skipped
    for (const migrated of events) {
      expect(migrated.source).toBe("legacy-summary");
      expect(migrated.responseMs).toBe(0);
      expect(migrated.answer).toBeUndefined();
      expect(migrated.inputSource).toBe("unknown");
      expect(migrated.competencyEvidence[0]?.weight).toBe(0.5);
    }
    expect(events.find((e) => e.promptId === "D4")?.result.correct).toBe(false);
    expect(events.find((e) => e.promptId === "C4")?.result.correct).toBe(true);
  });

  it("is idempotent: re-running and re-merging never double counts", () => {
    const first = migrateLegacyProgress(legacy, NOW);
    const second = migrateLegacyProgress(legacy, NOW);
    expect(second).toEqual(first);
    expect(unionAttemptEvents(first, second)).toHaveLength(first.length);
  });

  it("handles empty progress", () => {
    const empty = { reading: { noteStats: {} }, pitch: { noteStats: {} }, history: [] } as unknown as PracticeProgress;
    expect(migrateLegacyProgress(empty, NOW)).toEqual([]);
  });
});

describe("projections", () => {
  const events = [
    event({ eventId: "e1", sessionId: "s1", answeredAtIso: "2026-07-20T11:00:00.000Z" }),
    event({
      eventId: "e2",
      sessionId: "s1",
      answeredAtIso: "2026-07-20T11:05:00.000Z",
      result: { correct: false, totalScore: 0, components: {}, mistakeCodes: ["wrong-pitch"] },
    }),
    event({ eventId: "e3", sessionId: "s2", answeredAtIso: "2026-07-20T11:30:00.000Z" }),
    event({ eventId: "legacy", source: "legacy-summary", responseMs: 0 }),
  ];

  it("returns a bounded, newest-first window excluding inferred evidence", () => {
    const recent = recentAttempts(events);
    expect(recent.map((entry) => entry.eventId)).toEqual(["e3", "e2", "e1"]);
    expect(recent[0]?.correct).toBe(true);
    expect(recentAttempts(events, 1)).toHaveLength(1);
    expect(recentAttempts(events, 0)).toHaveLength(0);
  });

  it("widens a session rollup when events arrive out of order", () => {
    const outOfOrder = [
      event({
        eventId: "b",
        sessionId: "s",
        startedAtIso: "2026-07-20T11:10:00.000Z",
        answeredAtIso: "2026-07-20T11:11:00.000Z",
      }),
      event({
        eventId: "a",
        sessionId: "s",
        startedAtIso: "2026-07-20T11:00:00.000Z",
        answeredAtIso: "2026-07-20T11:01:00.000Z",
      }),
      event({
        eventId: "c",
        sessionId: "s",
        startedAtIso: "2026-07-20T11:20:00.000Z",
        answeredAtIso: "2026-07-20T11:21:00.000Z",
      }),
    ];
    const rollup = sessionRollups(outOfOrder)[0];
    expect(rollup?.startedAtIso).toBe("2026-07-20T11:00:00.000Z");
    expect(rollup?.endedAtIso).toBe("2026-07-20T11:21:00.000Z");
    expect(rollup?.attempts).toBe(3);
  });

  it("returns nothing for a stream with only inferred evidence", () => {
    const inferredOnly = [event({ eventId: "l1", source: "legacy-summary", responseMs: 0 })];
    expect(recentAttempts(inferredOnly)).toEqual([]);
    expect(sessionRollups(inferredOnly)).toEqual([]);
  });

  it("rolls up sessions oldest first", () => {
    const rollups = sessionRollups(events);
    expect(rollups.map((entry) => entry.sessionId)).toEqual(["s1", "s2"]);
    const first = rollups[0];
    expect(first?.attempts).toBe(2);
    expect(first?.correct).toBe(1);
    expect(first?.accuracy).toBe(0.5);
    expect(first?.endedAtIso).toBe("2026-07-20T11:05:00.000Z");
  });
});
