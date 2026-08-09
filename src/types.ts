import type { MicStatus, MicSupport } from "./voice/microphone";
import type {
  AssessmentPassage,
  SingingStage,
  SingingStageId,
  SingingExercise,
  SungScore,
  VocalRange,
  ExerciseDefinition,
  SequenceComparison,
  TranscriptionScore,
  NotatedNote,
  ReadingMode,
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

// Ear training and staff transcription (Slice 11).
export type {
  NotatedNote,
  Interval,
  IntervalId,
  ChordQuality,
  ChordQualityId,
  Scale,
  ScaleId,
  Cadence,
  CadenceId,
  SequenceStep,
  SequenceComparison,
  TranscribedNote,
  TranscriptionScore,
  ReplayPolicy,
  EarChoiceOption,
} from "@notesense/shared";
export {
  INTERVALS,
  CHORD_QUALITIES,
  SCALES,
  CADENCES,
  chordMidi,
  scaleMidi,
  cadenceMidi,
  intervalBySemitones,
  compareSequences,
  describeSequenceComparison,
  scoreTranscription,
  canReplay,
  describeReplays,
  REPLAY_POLICIES,
  earChoiceOptions,
  EAR_GENERATORS,
  MAX_SEQUENCE_LENGTH,
  MIN_SEQUENCE_LENGTH,
} from "@notesense/shared";

// Singing and microphone analysis (Slice 12).
export type {
  PitchEstimate,
  PitchFrame,
  SungSummary,
  SungTarget,
  SungComponents,
  SungNoteResult,
  SungScore,
  VocalRange,
  SingingStage,
  SingingStageId,
  SingingExercise,
} from "@notesense/shared";
export {
  detectPitch,
  hertzToMidi,
  midiToHertz,
  centsBetween,
  buildContour,
  voicedFrames,
  centreMidi,
  centreLine,
  onsetSeconds,
  scoreSinging,
  describeSinging,
  deriveVocalRange,
  normalizeVocalRange,
  fitToRange,
  isSingable,
  referenceMidi,
  describeRange,
  IN_TUNE_CENTS,
  VOCAL_RANGE_VERSION,
  SINGING_STAGES,
  singingStage,
  buildSingingExercise,
  exerciseSeconds,
} from "@notesense/shared";

// What the singing screen renders. Declared here so the workspace stays
// presentational and does not import its behaviour from a hook.
export type SingingDrillView = {
  support: MicSupport;
  status: MicStatus;
  stages: readonly SingingStage[];
  stageId: SingingStageId;
  exercise: SingingExercise;
  // Absent until the learner has calibrated.
  range: VocalRange | undefined;
  // 0..1 input meter, so a learner can see the microphone is hearing them.
  level: number;
  score: SungScore | null;
  isCalibrating: boolean;
  // Counts down after permission is granted, before frames are captured.
  countdownSeconds: number | null;
  // The currently detected pitch, only while listening. It is never stored.
  liveMidi: number | null;
  feedback: string | undefined;
  setStage: (stageId: SingingStageId) => void;
  start: () => void;
  stop: () => void;
  startCalibration: () => void;
  playReference: () => void;
  playPrompt: () => void;
  next: () => void;
};

export type { MicSupport, MicStatus, MicPanelProps } from "./voice/microphone";

// The ear families a learner can pick, in the order they meet them.
export type EarFamilyId =
  | "ear.interval"
  | "ear.chord"
  | "ear.scale"
  | "ear.cadence"
  | "ear.interval-play"
  | "ear.sequence"
  | "ear.key-centre"
  | "ear.rhythm-echo"
  | "ear.transcription";

export type EarFamily = { id: EarFamilyId; label: string; summary: string };

// What an ear answer earned, and what to tell the learner about it. The
// comparison travels with the verdict so the screen can point at the note that
// went wrong rather than only showing a total.
export type EarResult = {
  correct: boolean;
  score: number;
  summary: string;
  expectedOptionId?: string;
  comparison?: SequenceComparison;
  transcription?: TranscriptionScore;
  rhythm?: RhythmScore;
};

export type EarSessionView = {
  definition: ExerciseDefinition | undefined;
  result: EarResult | null;
  canPlay: boolean;
  // Absent when replays are not limited in this mode.
  replaysLeft: string | undefined;
  play: () => void;
  submit: (answer: EarAnswerInput) => void;
  next: () => void;
  noteEntered: () => void;
};

export type EarAnswerInput =
  | { kind: "choice"; optionId: string }
  | { kind: "pitch-sequence"; midi: number[] }
  | { kind: "transcription"; notes: NotatedNote[] }
  // Tapped back, so this one is performed time: audio-clock seconds measured
  // against the tempo the phrase was played at.
  | { kind: "rhythm"; onsetsSeconds: number[]; bpm: number };

// The transcription editor, as the screen sees it.
export type TranscriberView = {
  notes: NotatedNote[];
  selected: number | null;
  canUndo: boolean;
  canRedo: boolean;
  select: (index: number | null) => void;
  place: (onsetTicks: number, midi: number) => void;
  removeAt: (index: number) => void;
  nudgePitch: (semitones: number) => void;
  nudgeOnset: (slots: number) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
};

export type EarDrillView = {
  family: EarFamilyId;
  families: readonly EarFamily[];
  mode: ReadingMode;
  session: EarSessionView;
  transcriber: TranscriberView;
  // Onset positions a transcribed note may occupy, in ticks.
  slots: number[];
  lowMidi: number;
  highMidi: number;
  // Notes played back so far for the reproduction families.
  entered: number[];
  taps: number[];
  setFamily: (family: EarFamilyId) => void;
  setMode: (mode: ReadingMode) => void;
  playNote: (noteId: string) => void;
  // Routes a physical piano note through the same answer assembly as touch.
  midiNote: (noteId: string) => void;
  undoNote: () => void;
  clearNotes: () => void;
  tap: () => void;
  // Named answers submit immediately; assembled answers submit when the learner
  // says they are done.
  submitChoice: (optionId: string) => void;
  submit: () => void;
  playAnswer: () => void;
};

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
