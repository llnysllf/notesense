// A continuous 0..1 difficulty scale, finer than the song beginner/intermediate/
// advanced buckets, so placement and adaptive selection can order items and
// assessments can target a band.

export const MIN_DIFFICULTY = 0;
export const MAX_DIFFICULTY = 1;

export function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return MIN_DIFFICULTY;
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));
}

export type DifficultyBand = "intro" | "easy" | "medium" | "hard";

export function difficultyBand(value: number): DifficultyBand {
  const clamped = clampDifficulty(value);
  if (clamped < 0.25) return "intro";
  if (clamped < 0.5) return "easy";
  if (clamped < 0.75) return "medium";
  return "hard";
}
