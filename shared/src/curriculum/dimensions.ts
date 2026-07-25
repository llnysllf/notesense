// Content dimensions: the material and presentation conditions an exercise runs
// under. Mastery is tracked per competency x selected dimensions, so these are
// data, not part of the competency id.

export type DimensionKey =
  | "clef"
  | "writtenRange"
  | "soundingRange"
  | "key"
  | "meter"
  | "tempo"
  | "rhythmVocabulary"
  | "hand"
  | "polyphony"
  | "sequenceLength"
  | "inputMode";

export type DimensionValue = string | number | boolean;
export type Dimensions = Partial<Record<DimensionKey, DimensionValue>>;

export const DIMENSION_KEYS: readonly DimensionKey[] = [
  "clef",
  "writtenRange",
  "soundingRange",
  "key",
  "meter",
  "tempo",
  "rhythmVocabulary",
  "hand",
  "polyphony",
  "sequenceLength",
  "inputMode",
];

const KEY_SET = /* @__PURE__ */ new Set<string>(DIMENSION_KEYS);

export function isDimensionKey(value: unknown): value is DimensionKey {
  return typeof value === "string" && KEY_SET.has(value);
}

function isDimensionValue(value: unknown): value is DimensionValue {
  return (
    (typeof value === "string" && value.length <= 60) ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}

// Keeps only known keys with primitive values; drops everything else.
export function normalizeDimensions(value: unknown): Dimensions {
  if (typeof value !== "object" || value === null) return {};
  const result: Dimensions = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isDimensionKey(key) && isDimensionValue(entry)) {
      result[key] = entry;
    }
  }
  return result;
}
