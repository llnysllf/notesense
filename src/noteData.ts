import type {
  ModeProgress,
  NoteName,
  PitchNote,
  PracticeProgress,
  ReadingNoteName,
  ReadingRange,
  StaffClef,
  TrainingNote,
} from "./types";

type ReadingRangeConfig = {
  id: ReadingRange;
  label: string;
  clef: StaffClef;
  detail: string;
  notes: TrainingNote[];
};

export const DEFAULT_READING_RANGE: ReadingRange = "treble-starter";

export const TREBLE_STARTER_NOTES: TrainingNote[] = [
  {
    id: "C4",
    name: "C",
    octave: 4,
    frequency: 261.63,
    staffY: 136,
    clef: "treble",
    ledgerLineY: 136,
    keyboardShortcut: "1",
  },
  {
    id: "D4",
    name: "D",
    octave: 4,
    frequency: 293.66,
    staffY: 128,
    clef: "treble",
    keyboardShortcut: "2",
  },
  {
    id: "E4",
    name: "E",
    octave: 4,
    frequency: 329.63,
    staffY: 120,
    clef: "treble",
    keyboardShortcut: "3",
  },
  {
    id: "F4",
    name: "F",
    octave: 4,
    frequency: 349.23,
    staffY: 112,
    clef: "treble",
    keyboardShortcut: "4",
  },
  {
    id: "G4",
    name: "G",
    octave: 4,
    frequency: 392,
    staffY: 104,
    clef: "treble",
    keyboardShortcut: "5",
  },
];

export const BASS_STARTER_NOTES: TrainingNote[] = [
  {
    id: "C3",
    name: "C",
    octave: 3,
    frequency: 130.81,
    staffY: 96,
    clef: "bass",
    keyboardShortcut: "1",
  },
  {
    id: "D3",
    name: "D",
    octave: 3,
    frequency: 146.83,
    staffY: 88,
    clef: "bass",
    keyboardShortcut: "2",
  },
  {
    id: "E3",
    name: "E",
    octave: 3,
    frequency: 164.81,
    staffY: 80,
    clef: "bass",
    keyboardShortcut: "3",
  },
  {
    id: "F3",
    name: "F",
    octave: 3,
    frequency: 174.61,
    staffY: 72,
    clef: "bass",
    keyboardShortcut: "4",
  },
  {
    id: "G3",
    name: "G",
    octave: 3,
    frequency: 196,
    staffY: 64,
    clef: "bass",
    keyboardShortcut: "5",
  },
];

export const READING_RANGES: ReadingRangeConfig[] = [
  {
    id: "treble-starter",
    label: "Treble",
    clef: "treble",
    detail: "Treble clef C4-G4",
    notes: TREBLE_STARTER_NOTES,
  },
  {
    id: "bass-starter",
    label: "Bass",
    clef: "bass",
    detail: "Bass clef C3-G3",
    notes: BASS_STARTER_NOTES,
  },
];

export const STARTER_NOTES = TREBLE_STARTER_NOTES;
export const READING_NOTES = [...TREBLE_STARTER_NOTES, ...BASS_STARTER_NOTES];
export const READING_ANSWER_OPTIONS: ReadingNoteName[] = ["C", "D", "E", "F", "G"];
export const PITCH_ANSWER_OPTIONS: NoteName[] = ["C", "D", "E", "F", "G", "A", "B"];

export const PITCH_NOTES: PitchNote[] = [
  {
    id: "C4",
    name: "C",
    octave: 4,
    frequency: 261.63,
    keyboardShortcut: "1",
  },
  {
    id: "D4",
    name: "D",
    octave: 4,
    frequency: 293.66,
    keyboardShortcut: "2",
  },
  {
    id: "E4",
    name: "E",
    octave: 4,
    frequency: 329.63,
    keyboardShortcut: "3",
  },
  {
    id: "F4",
    name: "F",
    octave: 4,
    frequency: 349.23,
    keyboardShortcut: "4",
  },
  {
    id: "G4",
    name: "G",
    octave: 4,
    frequency: 392,
    keyboardShortcut: "5",
  },
  {
    id: "A4",
    name: "A",
    octave: 4,
    frequency: 440,
    keyboardShortcut: "6",
  },
  {
    id: "B4",
    name: "B",
    octave: 4,
    frequency: 493.88,
    keyboardShortcut: "7",
  },
];

function getDefaultReadingRangeConfig(): ReadingRangeConfig {
  const rangeConfig = READING_RANGES.find((range) => range.id === DEFAULT_READING_RANGE);
  if (!rangeConfig) {
    throw new Error(`Missing NoteSense reading range: ${DEFAULT_READING_RANGE}`);
  }

  return rangeConfig;
}

const defaultReadingRangeConfig = getDefaultReadingRangeConfig();

function createEmptyModeProgress(notes: Array<{ id: string }>): ModeProgress {
  return {
    totalAttempts: 0,
    totalCorrect: 0,
    bestRoundScore: 0,
    sessionsCompleted: 0,
    noteStats: notes.reduce<Record<string, { attempts: number; correct: number }>>((stats, note) => {
      stats[note.id] = { attempts: 0, correct: 0 };
      return stats;
    }, {}),
  };
}

export function isReadingRange(value: unknown): value is ReadingRange {
  return READING_RANGES.some((range) => range.id === value);
}

export function getReadingRange(range: ReadingRange): ReadingRangeConfig {
  return READING_RANGES.find((rangeConfig) => rangeConfig.id === range) ?? defaultReadingRangeConfig;
}

export function getReadingNotes(range: ReadingRange = DEFAULT_READING_RANGE): TrainingNote[] {
  return getReadingRange(range).notes;
}

export const emptyReadingProgress = createEmptyModeProgress(READING_NOTES);
export const emptyPitchProgress = createEmptyModeProgress(PITCH_NOTES);

export const emptyProgress: PracticeProgress = {
  reading: emptyReadingProgress,
  pitch: emptyPitchProgress,
  history: [],
};
