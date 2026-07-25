// How an exercise is scored, declared as data so the runtime never hides all
// feedback behind one opaque percentage: components stay visible.

export type ScoringComponent = "pitch" | "rhythm" | "continuity" | "fluency";

export type ScoringPolicy = {
  components: ScoringComponent[];
  passThreshold: number; // 0..1 fraction of the total score needed to pass
  toleranceMs?: number; // timing window for rhythm/performance components
  revealAnswer?: boolean;
};

const COMPONENTS = new Set<string>(["pitch", "rhythm", "continuity", "fluency"]);

export const DEFAULT_SCORING_POLICY: ScoringPolicy = { components: ["pitch"], passThreshold: 0.8 };

export function normalizeScoringPolicy(value: unknown): ScoringPolicy {
  if (typeof value !== "object" || value === null) return { ...DEFAULT_SCORING_POLICY };
  const candidate = value as {
    components?: unknown;
    passThreshold?: unknown;
    toleranceMs?: unknown;
    revealAnswer?: unknown;
  };

  const components = Array.isArray(candidate.components)
    ? [...new Set(candidate.components.filter((entry): entry is ScoringComponent => COMPONENTS.has(entry as string)))]
    : [];
  const passThreshold =
    typeof candidate.passThreshold === "number" && candidate.passThreshold >= 0 && candidate.passThreshold <= 1
      ? candidate.passThreshold
      : DEFAULT_SCORING_POLICY.passThreshold;

  const policy: ScoringPolicy = {
    components: components.length > 0 ? components : [...DEFAULT_SCORING_POLICY.components],
    passThreshold,
  };
  if (typeof candidate.toleranceMs === "number" && candidate.toleranceMs > 0)
    policy.toleranceMs = candidate.toleranceMs;
  if (typeof candidate.revealAnswer === "boolean") policy.revealAnswer = candidate.revealAnswer;
  return policy;
}
