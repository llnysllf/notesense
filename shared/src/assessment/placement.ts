// Finding a sensible place to start.
//
// Placement is short, skippable, and never authoritative. It answers one
// question — roughly where should today's practice begin — and it answers it
// from a handful of items rather than pretending to be an exam. The real work
// is the difficulty-tagged item bank behind it; this is a staircase over that
// bank, deliberately simple so its behaviour is obvious and testable.
//
// Two rules keep it honest. It moves within bounded steps, so one lucky or
// unlucky answer cannot throw a learner to the far end of the curriculum. And
// its result is a starting *hint*: it is stored apart from the evidence ledger
// and never overwrites anything actually measured from practice.

import { clampDifficulty, difficultyBand, type DifficultyBand } from "../curriculum/difficulty";
import { type MasterySnapshot } from "../evidence/mastery";
import { passageProfile } from "./passage";

export const PLACEMENT_VERSION = 1;

// Starting a placement above the middle makes the first item feel like a test
// the learner is failing; below it, the staircase climbs quickly anyway.
const START_DIFFICULTY = 0.4;
const START_STEP = 0.2;
// The largest single adjustment. Bounds the damage one misread item can do.
const MAX_STEP = 0.25;
// Once steps are this small, further items are not buying information.
const REFINED_STEP = 0.05;
const MIN_ITEMS = 5;
const MAX_ITEMS = 12;
const REVERSALS_FOR_CONFIDENCE = 2;
const EDGE_RUN = 3;

export type PlacementStopReason = "confident" | "item-limit" | "floor" | "ceiling";

export type PlacementAnswer = { difficulty: number; correct: boolean };

export type PlacementState = {
  version: number;
  // The difficulty of the item to present next, and the current adjustment size.
  difficulty: number;
  step: number;
  answered: number;
  // Direction changes. A staircase that has turned around a few times is
  // circling the learner's level rather than still climbing towards it.
  reversals: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  lastCorrect?: boolean;
  history: PlacementAnswer[];
  stopReason?: PlacementStopReason;
};

export function startPlacement(): PlacementState {
  return {
    version: PLACEMENT_VERSION,
    difficulty: START_DIFFICULTY,
    step: START_STEP,
    answered: 0,
    reversals: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    history: [],
  };
}

export function isPlacementComplete(state: PlacementState): boolean {
  return state.stopReason !== undefined;
}

function stopReasonFor(state: PlacementState): PlacementStopReason | undefined {
  if (state.consecutiveWrong >= EDGE_RUN && state.difficulty <= 0) return "floor";
  if (state.consecutiveCorrect >= EDGE_RUN && state.difficulty >= 1) return "ceiling";
  if (state.answered >= MIN_ITEMS && state.reversals >= REVERSALS_FOR_CONFIDENCE && state.step <= REFINED_STEP) {
    return "confident";
  }
  if (state.answered >= MAX_ITEMS) return "item-limit";
  return undefined;
}

// Records one answered item and produces the next state. Pure: the same state
// and answer always give the same result, so a placement run can be replayed.
export function answerPlacement(state: PlacementState, correct: boolean): PlacementState {
  if (isPlacementComplete(state)) return state;

  const reversed = state.lastCorrect !== undefined && state.lastCorrect !== correct;
  const step = Math.min(MAX_STEP, reversed ? Math.max(REFINED_STEP, state.step / 2) : state.step);

  const next: PlacementState = {
    ...state,
    difficulty: clampDifficulty(state.difficulty + (correct ? step : -step)),
    step,
    answered: state.answered + 1,
    reversals: state.reversals + (reversed ? 1 : 0),
    consecutiveCorrect: correct ? state.consecutiveCorrect + 1 : 0,
    consecutiveWrong: correct ? 0 : state.consecutiveWrong + 1,
    lastCorrect: correct,
    history: [...state.history, { difficulty: state.difficulty, correct }],
  };

  const stopReason = stopReasonFor(next);
  return stopReason ? { ...next, stopReason } : next;
}

export type PlacementOutcome = {
  version: number;
  difficulty: number;
  band: DifficultyBand;
  // 0..1. Never high: five items is a starting point, not a measurement.
  confidence: number;
  itemsAnswered: number;
  stopReason: PlacementStopReason;
  explanation: string;
  // Always true at this version. Placement is a hint the learner can change.
  isProvisional: boolean;
};

const EXPLANATIONS: Record<PlacementStopReason, string> = {
  confident: "Your answers settled around this level, so this is where practice will start. You can move it any time.",
  "item-limit":
    "This is the best read from a short check. Practice will start here and adjust as real evidence arrives.",
  floor:
    "The easiest material in this check was still hard, so practice will start at the beginning. That is a normal place to start.",
  ceiling:
    "You cleared everything this check had, so practice will start at the top of it — the harder material will come from practice itself.",
};

const CONFIDENCE_BY_REASON: Record<PlacementStopReason, number> = {
  confident: 0.5,
  "item-limit": 0.4,
  floor: 0.35,
  ceiling: 0.35,
};

// The learner's estimated level, from where the staircase settled rather than
// from the last item alone: the final answer is one observation, and the
// average of the turning points is a steadier read of the same run.
function settledDifficulty(state: PlacementState): number {
  if (state.history.length === 0) return state.difficulty;
  const recent = state.history.slice(-Math.min(state.history.length, 4));
  const total = recent.reduce((sum, entry) => sum + entry.difficulty, 0);
  return clampDifficulty(total / recent.length);
}

export function placementOutcome(state: PlacementState): PlacementOutcome | undefined {
  if (!state.stopReason) return undefined;

  const difficulty = state.stopReason === "floor" ? 0 : state.stopReason === "ceiling" ? 1 : settledDifficulty(state);
  const confidence = Math.min(
    0.7,
    CONFIDENCE_BY_REASON[state.stopReason] + 0.05 * Math.min(state.reversals, REVERSALS_FOR_CONFIDENCE * 2),
  );

  return {
    version: PLACEMENT_VERSION,
    difficulty,
    band: difficultyBand(difficulty),
    confidence,
    itemsAnswered: state.answered,
    stopReason: state.stopReason,
    explanation: EXPLANATIONS[state.stopReason],
    isProvisional: true,
  };
}

const STOP_REASONS = new Set<string>(["confident", "item-limit", "floor", "ceiling"]);

// Reads a stored outcome. Untrusted input: an unrecognisable one is discarded
// rather than repaired, because a placement is cheap to redo and a fabricated
// starting point is not.
export function normalizePlacementOutcome(value: unknown): PlacementOutcome | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  const stopReason = typeof candidate.stopReason === "string" ? candidate.stopReason : "";
  if (!STOP_REASONS.has(stopReason)) return undefined;
  if (candidate.version !== PLACEMENT_VERSION) return undefined;

  const difficulty = clampDifficulty(typeof candidate.difficulty === "number" ? candidate.difficulty : Number.NaN);
  const reason = stopReason as PlacementStopReason;

  return {
    version: PLACEMENT_VERSION,
    difficulty,
    band: difficultyBand(difficulty),
    confidence: Math.min(0.7, Math.max(0, typeof candidate.confidence === "number" ? candidate.confidence : 0)),
    itemsAnswered:
      typeof candidate.itemsAnswered === "number" && candidate.itemsAnswered >= 0
        ? Math.round(candidate.itemsAnswered)
        : 0,
    stopReason: reason,
    explanation: EXPLANATIONS[reason],
    isProvisional: true,
  };
}

export type PlacementStartingPoint = {
  difficulty: number;
  band: DifficultyBand;
  lowMidi: number;
  highMidi: number;
  bpm: number;
  summary: string;
};

// What the placement actually changes: the difficulty and range practice opens
// at. Expressed as a suggestion so the settings screen can present it as one.
export function placementStartingPoint(outcome: PlacementOutcome): PlacementStartingPoint {
  const profile = passageProfile(outcome.difficulty);
  return {
    difficulty: outcome.difficulty,
    band: outcome.band,
    lowMidi: profile.lowMidi,
    highMidi: profile.highMidi,
    bpm: profile.bpm,
    summary: `Starting at ${outcome.band} difficulty, ${profile.bars} bars at ${profile.bpm} bpm.`,
  };
}

// Real evidence outranks a placement guess. Once a learner has genuinely
// practised, their attempts describe them better than five placement items
// ever did, so the hint stops being applied rather than fighting the ledger.
const MEASURED_CONFIDENCE_FLOOR = 0.3;

export function hasMeasuredEvidence(snapshot: MasterySnapshot): boolean {
  return Object.values(snapshot.competencies).some(
    (mastery) => mastery.attempts > mastery.inferredAttempts && mastery.confidence >= MEASURED_CONFIDENCE_FLOOR,
  );
}

export function shouldOfferPlacement(snapshot: MasterySnapshot): boolean {
  return !hasMeasuredEvidence(snapshot);
}

// The starting point to apply, or undefined once practice has said more than
// the placement did. This is what keeps placement from overwriting evidence.
export function placementPrior(
  outcome: PlacementOutcome | undefined,
  snapshot: MasterySnapshot,
): PlacementStartingPoint | undefined {
  if (!outcome || hasMeasuredEvidence(snapshot)) return undefined;
  return placementStartingPoint(outcome);
}
