import { describe, expect, it } from "vitest";
import {
  appendReadingScore,
  createReadingScoreRecord,
  normalizeReadingScoreHistory,
  readingScoreTrend,
  READING_SCORE_HISTORY_LIMIT,
  type ReadingScoreRecord,
} from "./history";
import { buildAssessmentPassage } from "./passage";
import { buildShareCard, shareCardAltText } from "./shareCard";

function record(overrides: Partial<ReadingScoreRecord> = {}): ReadingScoreRecord {
  return {
    id: "r1",
    recordedAtIso: "2026-08-01T10:00:00.000Z",
    algorithmVersion: 1,
    formVersion: 1,
    formId: "reading-score:v1:medium:seed",
    band: "medium",
    difficulty: 0.6,
    score: 70,
    components: { noteAccuracy: 0.9, rhythmAccuracy: 0.7, continuity: 0.8, fluency: 0.6 },
    inputSource: "touch",
    isProvisional: true,
    ...overrides,
  };
}

describe("reading score history", () => {
  it("builds a record from a passage and a result", () => {
    const passage = buildAssessmentPassage({ difficulty: 0.6, seed: "seed" });
    const built = createReadingScoreRecord({
      id: "abc",
      recordedAtIso: "2026-08-01T10:00:00.000Z",
      passage,
      result: {
        algorithmVersion: 1,
        score: 62,
        components: { noteAccuracy: 0.8, rhythmAccuracy: 0.6, continuity: 0.5, fluency: 0.4 },
        difficulty: passage.difficulty,
        notesExpected: 15,
        notesPlayed: 15,
        confidence: 1,
        isProvisional: true,
      },
      inputSource: "midi",
    });

    expect(built.band).toBe(passage.band);
    expect(built.formId).toBe(passage.formId);
    expect(built.isProvisional).toBe(true);
  });

  it("drops entries that cannot be ordered or identified", () => {
    const history = normalizeReadingScoreHistory([
      record(),
      { ...record({ id: "r2" }), recordedAtIso: "not a date" },
      { ...record({ id: "" }) },
      "nonsense",
      null,
      42,
    ]);

    expect(history.map((entry) => entry.id)).toEqual(["r1"]);
  });

  it("returns nothing for input that is not a list", () => {
    expect(normalizeReadingScoreHistory({ score: 90 })).toEqual([]);
    expect(normalizeReadingScoreHistory(undefined)).toEqual([]);
  });

  it("clamps hostile values instead of trusting them", () => {
    const [entry] = normalizeReadingScoreHistory([
      {
        ...record(),
        score: 5000,
        difficulty: 12,
        components: { noteAccuracy: 900, rhythmAccuracy: -4, continuity: "high", fluency: Number.NaN },
        inputSource: "telepathy",
      },
    ]);

    expect(entry?.score).toBe(100);
    expect(entry?.difficulty).toBe(1);
    expect(entry?.components).toEqual({ noteAccuracy: 1, rhythmAccuracy: 0, continuity: 0, fluency: 0 });
    expect(entry?.inputSource).toBe("unknown");
  });

  it("treats data written before calibration was tracked as provisional", () => {
    const withoutFlag = { ...record() } as Record<string, unknown>;
    delete withoutFlag.isProvisional;

    expect(normalizeReadingScoreHistory([withoutFlag])[0]?.isProvisional).toBe(true);
  });

  it("orders newest first, drops duplicate ids, and stays bounded", () => {
    const many = Array.from({ length: READING_SCORE_HISTORY_LIMIT + 20 }, (_, index) =>
      record({ id: `r${index}`, recordedAtIso: new Date(Date.UTC(2026, 0, 1) + index * 86_400_000).toISOString() }),
    );
    const history = normalizeReadingScoreHistory([...many, record({ id: "r0" })]);

    expect(history).toHaveLength(READING_SCORE_HISTORY_LIMIT);
    expect(Date.parse(history[0]?.recordedAtIso ?? "")).toBeGreaterThan(Date.parse(history[1]?.recordedAtIso ?? ""));
    expect(new Set(history.map((entry) => entry.id)).size).toBe(history.length);
  });

  it("appends a new sitting to the front", () => {
    const history = appendReadingScore(
      [record()],
      record({ id: "r2", recordedAtIso: "2026-08-02T10:00:00.000Z", score: 75 }),
    );

    expect(history[0]?.id).toBe("r2");
  });
});

describe("reading score trend", () => {
  it("calls the first result a baseline", () => {
    expect(readingScoreTrend([record()]).kind).toBe("first");
    expect(readingScoreTrend([]).kind).toBe("first");
  });

  it("reports the change against the last comparable sitting", () => {
    const trend = readingScoreTrend([
      record({ id: "r2", recordedAtIso: "2026-08-02T10:00:00.000Z", score: 78 }),
      record({ score: 70 }),
    ]);

    expect(trend).toMatchObject({ kind: "comparable", deltaPoints: 8 });
    expect(trend.label).toMatch(/Up 8 points/);
  });

  it("refuses to compare across scoring versions, and says so", () => {
    const trend = readingScoreTrend([
      record({ id: "r2", recordedAtIso: "2026-08-02T10:00:00.000Z", score: 90 }),
      record({ algorithmVersion: 2 }),
    ]);

    // Silently comparing these would manufacture progress that never happened.
    expect(trend).toMatchObject({ kind: "not-comparable", reason: "algorithm-version" });
    expect(trend.label).toMatch(/different scoring version/i);
  });

  it("refuses to compare across difficulty bands, and says so", () => {
    const trend = readingScoreTrend([
      record({ id: "r2", recordedAtIso: "2026-08-02T10:00:00.000Z", score: 90 }),
      record({ band: "intro", difficulty: 0.1 }),
    ]);

    expect(trend).toMatchObject({ kind: "not-comparable", reason: "difficulty" });
    expect(trend.label).toMatch(/different difficulty/i);
  });

  it("skips past an incomparable sitting to reach one that matches", () => {
    const trend = readingScoreTrend([
      record({ id: "r3", recordedAtIso: "2026-08-03T10:00:00.000Z", score: 80 }),
      record({ id: "r2", recordedAtIso: "2026-08-02T10:00:00.000Z", band: "intro", difficulty: 0.1 }),
      record({ id: "r1", score: 70 }),
    ]);

    expect(trend).toMatchObject({ kind: "comparable", deltaPoints: 10 });
  });

  it("says when nothing moved", () => {
    const trend = readingScoreTrend([record({ id: "r2", recordedAtIso: "2026-08-02T10:00:00.000Z" }), record()]);

    expect(trend.label).toMatch(/same as your last comparable result/i);
  });
});

describe("share card", () => {
  const card = buildShareCard(record({ score: 68, inputSource: "midi" }));

  it("shows the result and its components, and nothing that identifies anyone", () => {
    expect(card.scoreText).toBe("68");
    expect(card.subtitle).toBe("Medium difficulty · on a piano");
    expect(card.lines.map((line) => line.label)).toEqual(["Notes", "Rhythm", "Continuity", "Fluency"]);
    expect(JSON.stringify(card)).not.toContain("r1");
    expect(JSON.stringify(card)).not.toContain("seed");
  });

  it("keeps the date to the day, not the minute someone was practising", () => {
    expect(card.dateText).toBe("2026-08-01");
  });

  it("carries the provisional caveat, because a screenshot outlives the screen", () => {
    expect(card.qualifier).toMatch(/not a standardized score/i);
    expect(buildShareCard(record({ isProvisional: false })).qualifier).toBe("");
  });

  it("reads aloud as one sentence", () => {
    const alt = shareCardAltText(card);

    expect(alt).toContain("NoteSense Reading Score: 68");
    expect(alt).toContain("Notes 90%");
    expect(alt).toMatch(/not a standardized score/i);
  });

  it("omits the input phrase when the source is unknown", () => {
    expect(buildShareCard(record({ inputSource: "unknown" })).subtitle).toBe("Medium difficulty");
  });

  it("omits the input phrase for a source it has no wording for", () => {
    const exotic = { ...record(), inputSource: "telepathy" } as unknown as Parameters<typeof buildShareCard>[0];

    expect(buildShareCard(exotic).subtitle).toBe("Medium difficulty");
  });

  it("reads aloud without a caveat once there is nothing to caveat", () => {
    const alt = shareCardAltText(buildShareCard(record({ isProvisional: false })));

    expect(alt).not.toMatch(/standardized/i);
    expect(alt).toContain("NoteSense Reading Score: 70");
  });

  it("labels every band it can be handed", () => {
    for (const [difficulty, band] of [
      [0.1, "Intro"],
      [0.3, "Easy"],
      [0.6, "Medium"],
      [0.9, "Hard"],
    ] as const) {
      const [entry] = normalizeReadingScoreHistory([record({ difficulty })]);
      expect(buildShareCard(entry as ReadingScoreRecord).subtitle).toContain(`${band} difficulty`);
    }
  });
});
