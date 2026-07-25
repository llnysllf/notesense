// The versioned, self-describing unit of practice content. Reading, pitch,
// rhythm, ear, and imported material all become ExerciseDefinitions, so the
// runtime, scorer, and evidence engine consume one shape instead of many.

import { isCompetencyId, type CompetencyId } from "../curriculum/competencies";
import { normalizeDimensions, type Dimensions } from "../curriculum/dimensions";
import { clampDifficulty } from "../curriculum/difficulty";
import { normalizeExpectedAnswer, type ExpectedAnswer } from "./answer";
import { normalizeScoringPolicy, type ScoringPolicy } from "./scoringPolicy";

export const EXERCISE_SCHEMA_VERSION = 1;

export type ExerciseInputMode = "touch" | "computer-keyboard" | "midi" | "microphone";

export type ExerciseStimulus =
  | { kind: "notation"; scoreId: string }
  | { kind: "prompt-note"; midi: number }
  | { kind: "audio-pitch"; midi: number[]; playback: "single" | "block" | "arpeggio" };

export type ContentSource = "builtin" | "generated" | "imported";

export type ExerciseDefinition = {
  schemaVersion: number;
  id: string;
  version: number;
  generatorVersion: number;
  curriculumVersion: number;
  skillMappingVersion: number;
  kind: string;
  title: string;
  competencyIds: CompetencyId[];
  dimensions: Dimensions;
  difficulty: number;
  estimatedSeconds: number;
  stimulus: ExerciseStimulus;
  expectedAnswer: ExpectedAnswer;
  inputModes: ExerciseInputMode[];
  scoringPolicy: ScoringPolicy;
  contentSource: ContentSource;
  seed?: string;
  license?: string;
};

const INPUT_MODES = /* @__PURE__ */ new Set<string>(["touch", "computer-keyboard", "midi", "microphone"]);
const SOURCES = /* @__PURE__ */ new Set<string>(["builtin", "generated", "imported"]);

function isMidi(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 21 && value <= 108;
}

function normalizeStimulus(value: unknown): ExerciseStimulus | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { kind?: unknown; scoreId?: unknown; midi?: unknown; playback?: unknown };
  if (candidate.kind === "notation" && typeof candidate.scoreId === "string" && candidate.scoreId.length > 0) {
    return { kind: "notation", scoreId: candidate.scoreId };
  }
  if (candidate.kind === "prompt-note" && isMidi(candidate.midi)) {
    return { kind: "prompt-note", midi: candidate.midi };
  }
  if (
    candidate.kind === "audio-pitch" &&
    Array.isArray(candidate.midi) &&
    candidate.midi.length > 0 &&
    candidate.midi.every(isMidi) &&
    (candidate.playback === "single" || candidate.playback === "block" || candidate.playback === "arpeggio")
  ) {
    return { kind: "audio-pitch", midi: [...candidate.midi], playback: candidate.playback };
  }
  return undefined;
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export function normalizeExerciseDefinition(value: unknown): ExerciseDefinition | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0) return null;
  if (typeof candidate.kind !== "string" || candidate.kind.length === 0) return null;
  if (typeof candidate.title !== "string" || candidate.title.trim().length === 0) return null;

  const stimulus = normalizeStimulus(candidate.stimulus);
  const expectedAnswer = normalizeExpectedAnswer(candidate.expectedAnswer);
  if (!stimulus || !expectedAnswer) return null;

  const competencyIds = Array.isArray(candidate.competencyIds)
    ? [...new Set(candidate.competencyIds.filter(isCompetencyId))]
    : [];
  if (competencyIds.length === 0) return null;

  const inputModes = Array.isArray(candidate.inputModes)
    ? [...new Set(candidate.inputModes.filter((mode): mode is ExerciseInputMode => INPUT_MODES.has(mode as string)))]
    : [];
  if (inputModes.length === 0) return null;

  const contentSource = SOURCES.has(candidate.contentSource as string)
    ? (candidate.contentSource as ContentSource)
    : "generated";

  const definition: ExerciseDefinition = {
    schemaVersion: EXERCISE_SCHEMA_VERSION,
    id: candidate.id,
    version: positiveInt(candidate.version, 1),
    generatorVersion: positiveInt(candidate.generatorVersion, 1),
    curriculumVersion: positiveInt(candidate.curriculumVersion, 1),
    skillMappingVersion: positiveInt(candidate.skillMappingVersion, 1),
    kind: candidate.kind,
    title: candidate.title.trim().slice(0, 120),
    competencyIds,
    dimensions: normalizeDimensions(candidate.dimensions),
    difficulty: clampDifficulty(typeof candidate.difficulty === "number" ? candidate.difficulty : 0),
    estimatedSeconds: positiveInt(candidate.estimatedSeconds, 10),
    stimulus,
    expectedAnswer,
    inputModes,
    scoringPolicy: normalizeScoringPolicy(candidate.scoringPolicy),
    contentSource,
  };
  if (typeof candidate.seed === "string" && candidate.seed.length > 0) definition.seed = candidate.seed;
  if (typeof candidate.license === "string" && candidate.license.length > 0) definition.license = candidate.license;
  return definition;
}
