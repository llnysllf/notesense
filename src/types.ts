import type {
  AssessmentPassage,
  Meter,
  NoteName,
  PlacementOutcome,
  PlacementStartingPoint,
  PlacementState,
  ReadingScoreRecord,
  ReadingScoreResult,
  ReadingScoreTrend,
  PracticeMode,
  PracticeSessionRecord,
  ReadingNoteName,
  RhythmPattern,
  RhythmScore,
  RhythmVocabulary,
} from "@notesense/shared";

export { MAX_PITCH_SEQUENCE_LENGTH, MIN_PITCH_SEQUENCE_LENGTH } from "@notesense/shared";

// Re-export the framework-agnostic data contract so existing `./types` imports keep working.
export type {
  AttemptProgress,
  CustomPitchRange,
  CustomReadingRange,
  MelodyLength,
  ModeProgress,
  NoteName,
  PracticeDataExport,
  PracticeDataImportResult,
  PracticeMode,
  PracticeProgress,
  PracticeSessionRecord,
  PracticeSettings,
  PitchExercise,
  PitchRange,
  PitchSequenceLength,
  ReadingNoteName,
  ReadingRange,
  RoundLength,
  Song,
  SongDifficulty,
  SongEvent,
  SongProgress,
  SongProgressEntry,
  TimeSignature,
} from "@notesense/shared";

// Canonical musical domain (Slice 1). Re-exported so app code keeps importing
// from `./types` rather than reaching into `@notesense/shared` directly.
export type {
  Rational,
  Transport,
  SpelledPitch,
  Step,
  Alter,
  Meter,
  KeySignature,
  ClefChange,
  Score,
  ScorePart,
  Measure,
  Voice,
  ScoreEvent,
  ScoreNote,
  ScoreRest,
  TimelineEvent,
  CompiledTimeline,
} from "@notesense/shared";
export {
  SCORE_MODEL_VERSION,
  TRANSPORT_V1,
  normalizeScore,
  normalizeScoreWithWarnings,
  compileScore,
  ticksToSeconds,
  songToScore,
  scoreToSong,
  midiToNoteId,
  noteIdToMidi,
} from "@notesense/shared";

// Curriculum + exercise content platform (Slice 2).
export type {
  CompetencyId,
  Competency,
  Dimensions,
  DifficultyBand,
  ExerciseDefinition,
  ExerciseStimulus,
  ExerciseInputMode,
  ExpectedAnswer,
  UserAnswer,
  ScoringPolicy,
  ExerciseGenerator,
} from "@notesense/shared";
export {
  COMPETENCIES,
  competencyOrder,
  normalizeExerciseDefinition,
  validateExerciseDefinition,
  matchAnswer,
  exerciseRegistry,
  BUILT_IN_GENERATORS,
} from "@notesense/shared";

// Unified exercise runtime (Slice 3).
export type {
  InputEvent,
  InputSource,
  RuntimeTransport,
  PromptState,
  PromptPhase,
  PromptCommand,
  SessionState,
  SessionCommand,
  CollectorMode,
  Scorer,
  AttemptOutcome,
} from "@notesense/shared";
export {
  createManualTransport,
  createPrompt,
  promptReducer,
  isPromptComplete,
  createSession,
  sessionReducer,
  isSessionComplete,
  sessionProgress,
  collectAnswer,
  collectorModeFor,
  exactScorer,
} from "@notesense/shared";

// Evidence ledger (Slice 4).
export type {
  AttemptEvent,
  AttemptResult,
  AttemptVersions,
  CompetencyEvidence,
  EvidenceSource,
  CompetencyMastery,
  MasterySnapshot,
  SelectionCandidate,
  RecentAttempt,
  SessionRollup,
} from "@notesense/shared";
export {
  normalizeAttemptEvent,
  unionAttemptEvents,
  buildMasterySnapshot,
  selectCompetencies,
  nextReviewDueIso,
  isDue,
  isMastered,
  migrateLegacyProgress,
  recentAttempts,
  sessionRollups,
} from "@notesense/shared";

// Daily plan (Slice 6).
export type { DailyPlan, DailyPlanBlock, DailyBlockRole, PlanActivity, PlanProgress } from "@notesense/shared";
export {
  DAILY_PLAN_VERSION,
  planDay,
  planProgress,
  markBlockComplete,
  startBlock,
  completeActiveBlock,
  isPlanStale,
  localDateKey,
  normalizeDailyPlan,
} from "@notesense/shared";

// Sight-Reading Academy (Slice 7).
export type {
  ReadingMode,
  ReadingModeRules,
  ReadingMistakeCode,
  ReadingMiss,
  MistakeGroup,
  ReadingTestForm,
} from "@notesense/shared";
export {
  READING_MODES,
  READING_MODE_IDS,
  READING_MISTAKE_LABELS,
  getReadingModeRules,
  normalizeReadingMode,
  classifyReadingMistake,
  groupMisses,
  buildReplaySet,
  buildReadingTestForm,
} from "@notesense/shared";

// Rhythm and timing engine (Slice 8).
export type {
  RhythmPattern,
  RhythmEvent,
  RhythmVocabulary,
  RhythmScore,
  OnsetResult,
  TapVerdict,
} from "@notesense/shared";
export {
  RHYTHM_VOCABULARIES,
  generateRhythmPattern,
  patternOnsetTicks,
  patternLengthTicks,
  gradeRhythm,
  describeRhythm,
  toleranceForTempo,
} from "@notesense/shared";

// What a rhythm drill is configured with, and what the screen needs from a
// running session. Declared here so the workspace stays presentational and does
// not import its behaviour from a hook.
export type RhythmSettings = {
  bpm: number;
  meter: Meter;
  bars: number;
  vocabulary: RhythmVocabulary;
};

export type RhythmSessionView = {
  pattern: RhythmPattern;
  isRunning: boolean;
  isCountingIn: boolean;
  score: RhythmScore | null;
  toleranceMs: number;
  // 0..1 playback position, driven from the metronome's audio clock.
  cursorProgress: number;
  start: () => void;
  stop: () => void;
  tap: () => void;
  newPattern: () => void;
};

// Web MIDI (Slice 9).
export type { MidiMessage, MidiAdapter, LatencySample, LatencyEstimate } from "@notesense/shared";
export {
  parseMidiMessage,
  createSustainTracker,
  createMidiAdapter,
  isPianoMidi,
  estimateLatency,
  describeLatency,
  MIN_LATENCY_SAMPLES,
} from "@notesense/shared";

// Placement and the Reading Score (Slice 10).
export type { AttemptInputSource } from "@notesense/shared";
export type {
  AssessmentAnswer,
  AssessmentNote,
  AssessmentPassage,
  PassageProfile,
  PlacementOutcome,
  PlacementStartingPoint,
  PlacementState,
  ReadingScoreComponents,
  ReadingScoreRecord,
  ReadingScoreResult,
  ReadingScoreTrend,
  ShareCardContent,
  ShareCardInput,
} from "@notesense/shared";
export {
  answerPlacement,
  appendReadingScore,
  buildAssessmentPassage,
  buildShareCard,
  createReadingScoreRecord,
  describeReadingScore,
  isPlacementComplete,
  isTrendworthy,
  normalizePlacementOutcome,
  normalizeReadingScoreHistory,
  passageProfile,
  placementOutcome,
  placementPrior,
  placementStartingPoint,
  readingScoreTrend,
  scoreReadingAssessment,
  shareCardAltText,
  shouldOfferPlacement,
  startPlacement,
  READING_SCORE_ALGORITHM_VERSION,
} from "@notesense/shared";

// What the assessment screens render. Declared here rather than beside the
// hooks that build them, so a presentational component can be typed against a
// view without importing a hook.
export type ReadingScoreRunStatus = "idle" | "count-in" | "running" | "complete";

export type PlacementView = {
  state: PlacementState;
  promptNoteId: string;
  isComplete: boolean;
  outcome: PlacementOutcome | undefined;
  startingPoint: PlacementStartingPoint | undefined;
  saved: PlacementOutcome | undefined;
  storageWarning: boolean;
  answer: (noteId: string) => void;
  restart: () => void;
  accept: () => void;
};

export type ReadingScoreView = {
  passage: AssessmentPassage;
  status: ReadingScoreRunStatus;
  answeredCount: number;
  result: ReadingScoreResult | null;
  isAudible: boolean;
  isTrendworthy: boolean;
  latest: ReadingScoreRecord | undefined;
  trend: ReadingScoreTrend;
  storageWarning: boolean;
  start: () => void;
  finish: () => void;
  play: (noteId: string) => void;
  retake: () => void;
};

export type AssessmentView = { placement: PlacementView; readingScore: ReadingScoreView };

export type StaffClef = "treble" | "bass";

export type TrainingNote = {
  id: string;
  name: ReadingNoteName;
  octave: number;
  frequency: number;
  staffY: number;
  clef: StaffClef;
  ledgerLineYs?: number[];
  keyboardShortcut: string;
};

export type PitchNote = {
  id: string;
  name: NoteName;
  octave: number;
  frequency: number;
  keyboardShortcut: string;
};

export type DataStatus = {
  message: string;
  tone: "success" | "warning";
} | null;

export type SessionSummary = {
  mode: PracticeMode;
  score: number;
  attempts: number;
  accuracy: number;
  bestStreak: number;
  focusItem?: string;
  suggestion: string;
};

export type SessionHistorySummary = {
  recentSessions: PracticeSessionRecord[];
  averageAccuracy: number;
  totalAttempts: number;
  totalPracticeSeconds: number;
  bestStreak: number;
};

export type DailyGoalSummary = {
  targetSessions: number;
  completedSessions: number;
  completionPercent: number;
  isComplete: boolean;
  currentStreak: number;
  bestStreak: number;
  todayPracticeSeconds: number;
  nextAction: string;
};

export type PracticeTrendPoint = {
  id: string;
  label: string;
  completedAt: string;
  accuracy: number;
  score: number;
  attempts: number;
};

export type PracticeInsightSummary = {
  trendPoints: PracticeTrendPoint[];
  latestAccuracy: number;
  accuracyDelta: number;
  bestStreak: number;
  totalPracticeSeconds: number;
};

export type PracticePlanTone = "baseline" | "focus" | "recovery" | "advance" | "steady";

export type PracticePlan = {
  tone: PracticePlanTone;
  title: string;
  focus: string;
  reason: string;
  target: string;
  steps: string[];
};

export type MasteryStatus = "new" | "learning" | "focus" | "strong";

export type MasteryItem = {
  id: string;
  label: string;
  attempts: number;
  accuracy: number;
  status: MasteryStatus;
};

export type MasterySummary = {
  items: MasteryItem[];
  averageAccuracy: number;
  strongCount: number;
  totalCount: number;
};

export type FeedbackState = {
  answer: NoteName;
  answerId?: string;
  isCorrect: boolean;
} | null;
