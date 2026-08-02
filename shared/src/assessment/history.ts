// The Reading Score over time.
//
// A single score is nearly meaningless; the point of the feature is the second
// one. That makes comparison the load-bearing part, and comparison is only
// allowed between sittings that measured the same thing: same algorithm, same
// form version, same difficulty band. When they differ the history still shows
// both, labelled — silently comparing incompatible results would manufacture
// progress that never happened.

import { difficultyBand, type DifficultyBand } from "../curriculum/difficulty";
import { type AttemptInputSource } from "../evidence/attemptEvent";
import { type AssessmentPassage } from "./passage";
import { type ReadingScoreComponents, type ReadingScoreResult } from "./readingScore";

export const READING_SCORE_HISTORY_LIMIT = 50;

export type ReadingScoreRecord = {
  id: string;
  recordedAtIso: string;
  algorithmVersion: number;
  formVersion: number;
  formId: string;
  band: DifficultyBand;
  difficulty: number;
  score: number;
  components: ReadingScoreComponents;
  // Declared before the run, because reading on a piano and tapping on glass
  // are not the same task and their results are not interchangeable.
  inputSource: AttemptInputSource;
  isProvisional: boolean;
};

const INPUT_SOURCES = new Set<string>(["touch", "computer-keyboard", "midi", "microphone", "unknown"]);
const COMPONENT_KEYS: readonly (keyof ReadingScoreComponents)[] = [
  "noteAccuracy",
  "rhythmAccuracy",
  "continuity",
  "fluency",
];

export function createReadingScoreRecord(options: {
  id: string;
  recordedAtIso: string;
  passage: AssessmentPassage;
  result: ReadingScoreResult;
  inputSource: AttemptInputSource;
}): ReadingScoreRecord {
  const { id, recordedAtIso, passage, result, inputSource } = options;
  return {
    id,
    recordedAtIso,
    algorithmVersion: result.algorithmVersion,
    formVersion: passage.formVersion,
    formId: passage.formId,
    band: passage.band,
    difficulty: passage.difficulty,
    score: result.score,
    components: result.components,
    inputSource,
    isProvisional: result.isProvisional,
  };
}

function clampUnit(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function normalizeComponents(value: unknown): ReadingScoreComponents {
  const candidate = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const components = {} as ReadingScoreComponents;
  for (const key of COMPONENT_KEYS) components[key] = clampUnit(candidate[key]);
  return components;
}

function normalizeRecord(value: unknown): ReadingScoreRecord | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;

  // An entry without a stable id or a real date cannot be ordered or deduped,
  // so it is dropped rather than repaired into something invented.
  const id = typeof candidate.id === "string" && candidate.id.length > 0 ? candidate.id : undefined;
  const recordedAtIso = typeof candidate.recordedAtIso === "string" ? candidate.recordedAtIso : "";
  if (!id || recordedAtIso.length === 0 || Number.isNaN(Date.parse(recordedAtIso))) return undefined;

  const difficulty = clampUnit(candidate.difficulty);
  const inputSource = typeof candidate.inputSource === "string" ? candidate.inputSource : "";

  return {
    id,
    recordedAtIso,
    algorithmVersion: positiveInt(candidate.algorithmVersion, 1),
    formVersion: positiveInt(candidate.formVersion, 1),
    formId: typeof candidate.formId === "string" ? candidate.formId : "",
    band: difficultyBand(difficulty),
    difficulty,
    score: Math.min(100, Math.max(0, Math.round(typeof candidate.score === "number" ? candidate.score : 0))),
    components: normalizeComponents(candidate.components),
    inputSource: (INPUT_SOURCES.has(inputSource) ? inputSource : "unknown") as AttemptInputSource,
    // Absent means old data written before calibration was tracked, which is
    // exactly the data that must not claim to be calibrated.
    isProvisional: candidate.isProvisional !== false,
  };
}

// Reads whatever was in storage. Untrusted input: anything unrecognisable is
// dropped, and the result is always ordered newest first.
export function normalizeReadingScoreHistory(value: unknown): ReadingScoreRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const records: ReadingScoreRecord[] = [];

  for (const entry of value) {
    const record = normalizeRecord(entry);
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    records.push(record);
  }

  return records
    .sort((a, b) => Date.parse(b.recordedAtIso) - Date.parse(a.recordedAtIso) || b.id.localeCompare(a.id))
    .slice(0, READING_SCORE_HISTORY_LIMIT);
}

export function appendReadingScore(
  history: readonly ReadingScoreRecord[],
  record: ReadingScoreRecord,
): ReadingScoreRecord[] {
  return normalizeReadingScoreHistory([record, ...history]);
}

export type TrendIncomparability = "algorithm-version" | "difficulty";

export type ReadingScoreTrend =
  | { kind: "first"; label: string }
  | { kind: "comparable"; deltaPoints: number; previous: ReadingScoreRecord; label: string }
  | { kind: "not-comparable"; reason: TrendIncomparability; previous: ReadingScoreRecord; label: string };

function comparability(a: ReadingScoreRecord, b: ReadingScoreRecord): TrendIncomparability | undefined {
  if (a.algorithmVersion !== b.algorithmVersion || a.formVersion !== b.formVersion) return "algorithm-version";
  if (a.band !== b.band) return "difficulty";
  return undefined;
}

const INCOMPARABLE_LABELS: Record<TrendIncomparability, string> = {
  "algorithm-version": "Not compared: your earlier result used a different scoring version.",
  difficulty: "Not compared: your earlier result was at a different difficulty.",
};

// The change since the last comparable sitting, or an explicit statement that
// there is nothing to compare to. Reads the newest record against the most
// recent earlier one that measured the same thing.
export function readingScoreTrend(history: readonly ReadingScoreRecord[]): ReadingScoreTrend {
  const [latest, ...earlier] = history;
  if (!latest || earlier.length === 0) return { kind: "first", label: "Your first Reading Score — a baseline." };

  const match = earlier.find((record) => comparability(latest, record) === undefined);
  if (match) {
    const deltaPoints = latest.score - match.score;
    const label =
      deltaPoints === 0
        ? "The same as your last comparable result."
        : `${deltaPoints > 0 ? "Up" : "Down"} ${Math.abs(deltaPoints)} points on your last comparable result.`;
    return { kind: "comparable", deltaPoints, previous: match, label };
  }

  const previous = earlier[0] as ReadingScoreRecord;
  const reason = comparability(latest, previous) as TrendIncomparability;
  return { kind: "not-comparable", reason, previous, label: INCOMPARABLE_LABELS[reason] };
}
