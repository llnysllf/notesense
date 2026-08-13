import { normalizeReadingMode } from "./reading/readingMode";
import { soundWorldById, DEFAULT_SOUND_WORLD_ID } from "./sound/registry";
import type {
  CustomPitchRange,
  CustomReadingRange,
  MelodyLength,
  PitchExercise,
  PitchRange,
  PracticeSettings,
  ReadingRange,
} from "./types";

export const READING_RANGE_IDS: readonly ReadingRange[] = [
  "treble-starter",
  "bass-starter",
  "treble-one-octave",
  "bass-one-octave",
  "grand-starter",
  "custom",
];
export const DEFAULT_READING_RANGE: ReadingRange = "treble-starter";
export const DEFAULT_CUSTOM_READING_RANGE: CustomReadingRange = { startNoteId: "C3", endNoteId: "B4" };
export const PITCH_RANGE_IDS: readonly PitchRange[] = ["natural", "chromatic", "two-octaves", "full", "custom"];
export const DEFAULT_PITCH_RANGE: PitchRange = "chromatic";
export const DEFAULT_CUSTOM_PITCH_RANGE: CustomPitchRange = { startNoteId: "C3", endNoteId: "B4" };
export const DEFAULT_PITCH_EXERCISE: PitchExercise = "single";
export const DEFAULT_MELODY_LENGTH: MelodyLength = 3;
export const MIN_PITCH_SEQUENCE_LENGTH = 3;
export const MAX_PITCH_SEQUENCE_LENGTH = 16;

export const defaultSettings: PracticeSettings = {
  roundLength: 60,
  readingRange: DEFAULT_READING_RANGE,
  customReadingRange: DEFAULT_CUSTOM_READING_RANGE,
  pitchRange: DEFAULT_PITCH_RANGE,
  customPitchRange: DEFAULT_CUSTOM_PITCH_RANGE,
  pitchExercise: DEFAULT_PITCH_EXERCISE,
  melodyLength: DEFAULT_MELODY_LENGTH,
  adaptivePractice: true,
  autoPlayPitch: true,
  revealPitchAfterAnswer: true,
  midiLatencyMs: 0,
  readingMode: "practice",
  soundWorldId: DEFAULT_SOUND_WORLD_ID,
};

export function isReadingRange(value: unknown): value is ReadingRange {
  return READING_RANGE_IDS.includes(value as ReadingRange);
}

export function isPitchRange(value: unknown): value is PitchRange {
  return PITCH_RANGE_IDS.includes(value as PitchRange);
}

function isPitchExercise(value: unknown): value is PitchExercise {
  return value === "single" || value === "melody";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNoteId(value: unknown): value is string {
  return typeof value === "string" && /^[A-G]#?\d$/.test(value);
}

function normalizeCustomReadingRange(value: unknown): CustomReadingRange {
  if (!isRecord(value)) return defaultSettings.customReadingRange;

  return {
    startNoteId: isNoteId(value.startNoteId) ? value.startNoteId : defaultSettings.customReadingRange.startNoteId,
    endNoteId: isNoteId(value.endNoteId) ? value.endNoteId : defaultSettings.customReadingRange.endNoteId,
  };
}

function normalizeCustomPitchRange(value: unknown): CustomPitchRange {
  if (!isRecord(value)) return defaultSettings.customPitchRange;

  return {
    startNoteId: isNoteId(value.startNoteId) ? value.startNoteId : defaultSettings.customPitchRange.startNoteId,
    endNoteId: isNoteId(value.endNoteId) ? value.endNoteId : defaultSettings.customPitchRange.endNoteId,
  };
}

export function normalizeSettings(settings: unknown): PracticeSettings {
  const settingsRecord = isRecord(settings) ? settings : {};
  const roundLength = [30, 60, 90].includes(Number(settingsRecord.roundLength))
    ? (Number(settingsRecord.roundLength) as PracticeSettings["roundLength"])
    : defaultSettings.roundLength;
  const melodyLength = Number(settingsRecord.melodyLength);
  const midiLatencyMs = Number(settingsRecord.midiLatencyMs);

  return {
    roundLength,
    readingRange: isReadingRange(settingsRecord.readingRange)
      ? settingsRecord.readingRange
      : defaultSettings.readingRange,
    customReadingRange: normalizeCustomReadingRange(settingsRecord.customReadingRange),
    pitchRange: isPitchRange(settingsRecord.pitchRange) ? settingsRecord.pitchRange : defaultSettings.pitchRange,
    customPitchRange: normalizeCustomPitchRange(settingsRecord.customPitchRange),
    pitchExercise: isPitchExercise(settingsRecord.pitchExercise)
      ? settingsRecord.pitchExercise
      : defaultSettings.pitchExercise,
    melodyLength:
      Number.isInteger(melodyLength) &&
      melodyLength >= MIN_PITCH_SEQUENCE_LENGTH &&
      melodyLength <= MAX_PITCH_SEQUENCE_LENGTH
        ? (melodyLength as MelodyLength)
        : defaultSettings.melodyLength,
    adaptivePractice:
      typeof settingsRecord.adaptivePractice === "boolean"
        ? settingsRecord.adaptivePractice
        : defaultSettings.adaptivePractice,
    autoPlayPitch:
      typeof settingsRecord.autoPlayPitch === "boolean" ? settingsRecord.autoPlayPitch : defaultSettings.autoPlayPitch,
    readingMode: normalizeReadingMode(settingsRecord.readingMode),
    // Resolving through the registry means an id for a world that no longer
    // ships comes back as the default rather than as silence.
    soundWorldId: soundWorldById(String(settingsRecord.soundWorldId ?? "")).id,
    revealPitchAfterAnswer:
      typeof settingsRecord.revealPitchAfterAnswer === "boolean"
        ? settingsRecord.revealPitchAfterAnswer
        : defaultSettings.revealPitchAfterAnswer,
    midiLatencyMs:
      Number.isFinite(midiLatencyMs) && midiLatencyMs >= 0 && midiLatencyMs <= 400
        ? Math.round(midiLatencyMs)
        : defaultSettings.midiLatencyMs,
  };
}
