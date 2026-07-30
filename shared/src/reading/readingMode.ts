// The four ways a learner can work on sight reading, expressed as rules rather
// than as scattered conditionals in the UI.
//
// The distinction that matters is Practice versus Test. Practice adapts to the
// learner and helps: it repeats weak material, reveals the answer, and can show
// hints. A test measures, so it must not do any of that — adapting mid-test or
// revealing answers would change what is being measured. Encoding both as data
// keeps that boundary explicit and testable instead of relying on every screen
// to remember it.

export type ReadingMode = "learn" | "practice" | "test" | "custom";

export type ReadingModeRules = {
  id: ReadingMode;
  label: string;
  summary: string;
  // Weight selection toward material the learner is weak on.
  adaptiveSelection: boolean;
  // Show the correct answer after a wrong attempt.
  revealAnswer: boolean;
  // Offer note-name labels and landmark hints.
  allowHints: boolean;
  // Let the learner change range, clef, and length.
  allowCustomRange: boolean;
  // Draw prompts from unseen material rather than what has been practised.
  unseenMaterial: boolean;
  // Contribute to mastery evidence used for planning and progress.
  contributesEvidence: boolean;
  // A fixed prompt count, so results are comparable between sittings.
  fixedPromptCount?: number;
};

export const READING_MODES: Readonly<Record<ReadingMode, ReadingModeRules>> = {
  learn: {
    id: "learn",
    label: "Learn",
    summary: "Guided.",
    adaptiveSelection: false,
    revealAnswer: true,
    allowHints: true,
    allowCustomRange: false,
    unseenMaterial: false,
    contributesEvidence: true,
  },
  practice: {
    id: "practice",
    label: "Practice",
    summary: "Adaptive.",
    adaptiveSelection: true,
    revealAnswer: true,
    allowHints: false,
    allowCustomRange: false,
    unseenMaterial: false,
    contributesEvidence: true,
  },
  test: {
    id: "test",
    label: "Test",
    summary: "No-hint fixed test.",
    // A test measures; adapting or revealing would change what it measures.
    adaptiveSelection: false,
    revealAnswer: false,
    allowHints: false,
    allowCustomRange: false,
    unseenMaterial: true,
    // Assessment items are kept out of ordinary practice evidence so a score
    // cannot be inflated by having just drilled the same notes.
    contributesEvidence: false,
    fixedPromptCount: 20,
  },
  custom: {
    id: "custom",
    label: "Custom",
    summary: "Range.",
    adaptiveSelection: false,
    revealAnswer: true,
    allowHints: true,
    allowCustomRange: true,
    unseenMaterial: false,
    contributesEvidence: true,
  },
};

export const READING_MODE_IDS = Object.keys(READING_MODES) as ReadingMode[];

export function isReadingMode(value: unknown): value is ReadingMode {
  return typeof value === "string" && value in READING_MODES;
}

export function getReadingModeRules(mode: ReadingMode): ReadingModeRules {
  return READING_MODES[mode];
}

export function normalizeReadingMode(value: unknown): ReadingMode {
  return isReadingMode(value) ? value : "practice";
}
