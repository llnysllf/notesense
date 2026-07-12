import type {
  CustomReadingRange,
  ModeProgress,
  NoteName,
  PitchNote,
  PracticeProgress,
  ReadingNoteName,
  ReadingRange,
  StaffClef,
  TrainingNote,
} from "./types";

const PIANO_MIDI_START = 21;
const PIANO_MIDI_END = 108;
const PIANO_KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const NATURAL_NOTE_NAMES: readonly NoteName[] = ["C", "D", "E", "F", "G", "A", "B"];
export const CUSTOM_READING_MIN_NOTE_ID = "C2";
export const CUSTOM_READING_MAX_NOTE_ID = "B5";
const CUSTOM_READING_MIN_MIDI = 36;
const CUSTOM_READING_MAX_MIDI = 83;
const TREBLE_BASE_NOTE = { name: "C" as const, octave: 4, staffY: 136 };
const BASS_BASE_NOTE = { name: "C" as const, octave: 3, staffY: 96 };

export type PianoKeyName = (typeof PIANO_KEY_NAMES)[number];

export type PianoKey = {
  id: string;
  name: PianoKeyName;
  naturalName: NoteName;
  octave: number;
  midi: number;
  isBlack: boolean;
  whiteKeyIndex?: number;
  blackKeyAfterWhiteIndex?: number;
};

export const DEFAULT_CUSTOM_READING_RANGE: CustomReadingRange = { startNoteId: "C3", endNoteId: "B4" };

type ReadingRangeConfig = {
  id: ReadingRange;
  label: string;
  clef: StaffClef;
  detail: string;
  notes: TrainingNote[];
};

export const DEFAULT_READING_RANGE: ReadingRange = "treble-starter";

function getPianoKeyNaturalName(name: PianoKeyName): NoteName {
  return name[0] as NoteName;
}

function getDiatonicIndex(name: NoteName, octave: number): number {
  return octave * NATURAL_NOTE_NAMES.length + NATURAL_NOTE_NAMES.indexOf(name);
}

function getFrequencyFromMidi(midi: number): number {
  return Number((440 * 2 ** ((midi - 69) / 12)).toFixed(2));
}

function getStaffY(name: NoteName, octave: number, clef: StaffClef): number {
  const baseNote = clef === "treble" ? TREBLE_BASE_NOTE : BASS_BASE_NOTE;
  const diatonicStep = getDiatonicIndex(name, octave) - getDiatonicIndex(baseNote.name, baseNote.octave);

  return baseNote.staffY - diatonicStep * 8;
}

function getLedgerLineYs(staffY: number): number[] {
  if (staffY > 120) {
    return Array.from({ length: Math.floor((staffY - 120) / 16) }, (_, index) => 136 + index * 16);
  }

  if (staffY < 56) {
    return Array.from({ length: Math.floor((56 - staffY) / 16) }, (_, index) => 40 - index * 16);
  }

  return [];
}

function createReadingNoteFromMidi(midi: number, keyboardShortcut = ""): TrainingNote {
  const keyName = PIANO_KEY_NAMES[midi % PIANO_KEY_NAMES.length]!;
  const octave = Math.floor(midi / PIANO_KEY_NAMES.length) - 1;
  const name = getPianoKeyNaturalName(keyName);
  const clef: StaffClef = midi < 60 ? "bass" : "treble";
  const staffY = getStaffY(name, octave, clef);

  return {
    id: `${keyName}${octave}`,
    name,
    octave,
    frequency: getFrequencyFromMidi(midi),
    staffY,
    clef,
    ledgerLineYs: getLedgerLineYs(staffY),
    keyboardShortcut,
  };
}

export const TREBLE_ONE_OCTAVE_NOTES: TrainingNote[] = [
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
  {
    id: "A4",
    name: "A",
    octave: 4,
    frequency: 440,
    staffY: 96,
    clef: "treble",
    keyboardShortcut: "6",
  },
  {
    id: "B4",
    name: "B",
    octave: 4,
    frequency: 493.88,
    staffY: 88,
    clef: "treble",
    keyboardShortcut: "7",
  },
];

export const TREBLE_STARTER_NOTES = TREBLE_ONE_OCTAVE_NOTES.slice(0, 5);

export const BASS_ONE_OCTAVE_NOTES: TrainingNote[] = [
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
  {
    id: "A3",
    name: "A",
    octave: 3,
    frequency: 220,
    staffY: 56,
    clef: "bass",
    keyboardShortcut: "6",
  },
  {
    id: "B3",
    name: "B",
    octave: 3,
    frequency: 246.94,
    staffY: 48,
    clef: "bass",
    keyboardShortcut: "7",
  },
];

export const BASS_STARTER_NOTES = BASS_ONE_OCTAVE_NOTES.slice(0, 5);
export const GRAND_STARTER_NOTES = [...BASS_ONE_OCTAVE_NOTES, ...TREBLE_ONE_OCTAVE_NOTES];
export const CUSTOM_READING_NOTES: TrainingNote[] = Array.from(
  { length: PIANO_MIDI_END - PIANO_MIDI_START + 1 },
  (_, index) => PIANO_MIDI_START + index,
)
  .filter((midi) => {
    const keyName = PIANO_KEY_NAMES[midi % PIANO_KEY_NAMES.length]!;
    return !keyName.includes("#") && midi >= CUSTOM_READING_MIN_MIDI && midi <= CUSTOM_READING_MAX_MIDI;
  })
  .map((midi) => createReadingNoteFromMidi(midi));
export const CUSTOM_READING_KEY_IDS = CUSTOM_READING_NOTES.map((note) => note.id);

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
  {
    id: "treble-one-octave",
    label: "Treble octave",
    clef: "treble",
    detail: "Treble clef C4-B4",
    notes: TREBLE_ONE_OCTAVE_NOTES,
  },
  {
    id: "bass-one-octave",
    label: "Bass octave",
    clef: "bass",
    detail: "Bass clef C3-B3",
    notes: BASS_ONE_OCTAVE_NOTES,
  },
  {
    id: "grand-starter",
    label: "Grand",
    clef: "treble",
    detail: "Mixed clef C3-B4",
    notes: GRAND_STARTER_NOTES,
  },
  {
    id: "custom",
    label: "Custom",
    clef: "treble",
    detail: "Custom C3-B4",
    notes: GRAND_STARTER_NOTES,
  },
];

export const STARTER_NOTES = TREBLE_STARTER_NOTES;
export const READING_NOTES = Array.from(
  new Map([...CUSTOM_READING_NOTES, ...GRAND_STARTER_NOTES].map((note) => [note.id, note])).values(),
);
export const READING_ANSWER_OPTIONS: ReadingNoteName[] = ["C", "D", "E", "F", "G", "A", "B"];
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

function createPianoKeys(): PianoKey[] {
  let whiteKeyIndex = 0;

  return Array.from({ length: PIANO_MIDI_END - PIANO_MIDI_START + 1 }, (_, index) => {
    const midi = PIANO_MIDI_START + index;
    const name = PIANO_KEY_NAMES[midi % PIANO_KEY_NAMES.length]!;
    const octave = Math.floor(midi / PIANO_KEY_NAMES.length) - 1;
    const isBlack = name.includes("#");
    const key: PianoKey = {
      id: `${name}${octave}`,
      name,
      naturalName: getPianoKeyNaturalName(name),
      octave,
      midi,
      isBlack,
    };

    if (isBlack) {
      key.blackKeyAfterWhiteIndex = whiteKeyIndex - 1;
    } else {
      key.whiteKeyIndex = whiteKeyIndex;
      whiteKeyIndex += 1;
    }

    return key;
  });
}

export const PIANO_KEYS = createPianoKeys();
export const PIANO_WHITE_KEY_COUNT = PIANO_KEYS.filter((key) => !key.isBlack).length;

// Sheet placement for any 88-key note id ("C4", "F#3"): sharps sit on the
// same staff line as their natural letter and carry an accidental glyph.
export type SheetNotePlacement = {
  staffY: number;
  ledgerLineYs: number[];
  isSharp: boolean;
};

export function getNoteFrequency(noteId: string): number | undefined {
  const key = getPianoKeyById(noteId);
  return key ? getFrequencyFromMidi(key.midi) : undefined;
}

export function getSheetNotePlacement(noteId: string, clef: StaffClef): SheetNotePlacement | undefined {
  const key = getPianoKeyById(noteId);
  if (!key) return undefined;

  const staffY = getStaffY(key.naturalName, key.octave, clef);

  return {
    staffY,
    ledgerLineYs: getLedgerLineYs(staffY),
    isSharp: key.isBlack,
  };
}

export function getPianoKeyById(noteId: string): PianoKey | undefined {
  return PIANO_KEYS.find((key) => key.id === noteId);
}

const defaultReadingRangeConfig = READING_RANGES.find((range) => range.id === DEFAULT_READING_RANGE)!;
const customReadingRangeConfig = READING_RANGES.find((range) => range.id === "custom")!;

function getSupportedCustomReadingNote(noteId: string | undefined, fallbackNoteId: string): TrainingNote {
  return (
    CUSTOM_READING_NOTES.find((note) => note.id === noteId) ??
    CUSTOM_READING_NOTES.find((note) => note.id === fallbackNoteId)!
  );
}

export function normalizeCustomReadingRange(
  range: CustomReadingRange = DEFAULT_CUSTOM_READING_RANGE,
): CustomReadingRange {
  const startNote = getSupportedCustomReadingNote(range.startNoteId, DEFAULT_CUSTOM_READING_RANGE.startNoteId);
  const endNote = getSupportedCustomReadingNote(range.endNoteId, DEFAULT_CUSTOM_READING_RANGE.endNoteId);
  const startKey = getPianoKeyById(startNote.id);
  const endKey = getPianoKeyById(endNote.id);

  if (startKey !== undefined && endKey !== undefined && startKey.midi > endKey.midi) {
    return { startNoteId: endNote.id, endNoteId: startNote.id };
  }

  return { startNoteId: startNote.id, endNoteId: endNote.id };
}

export function getCustomReadingNotes(range: CustomReadingRange = DEFAULT_CUSTOM_READING_RANGE): TrainingNote[] {
  const normalizedRange = normalizeCustomReadingRange(range);
  const startMidi = getPianoKeyById(normalizedRange.startNoteId)?.midi ?? CUSTOM_READING_MIN_MIDI;
  const endMidi = getPianoKeyById(normalizedRange.endNoteId)?.midi ?? CUSTOM_READING_MAX_MIDI;

  return CUSTOM_READING_NOTES.filter((note) => {
    const midi = getPianoKeyById(note.id)?.midi;
    return midi !== undefined && midi >= startMidi && midi <= endMidi;
  });
}

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

export function getReadingRange(
  range: ReadingRange,
  customReadingRange: CustomReadingRange = DEFAULT_CUSTOM_READING_RANGE,
): ReadingRangeConfig {
  if (range === "custom") {
    const normalizedRange = normalizeCustomReadingRange(customReadingRange);

    return {
      ...customReadingRangeConfig,
      detail: `Custom ${normalizedRange.startNoteId}-${normalizedRange.endNoteId}`,
      notes: getCustomReadingNotes(normalizedRange),
    };
  }

  return READING_RANGES.find((rangeConfig) => rangeConfig.id === range) ?? defaultReadingRangeConfig;
}

export function getReadingNotes(
  range: ReadingRange = DEFAULT_READING_RANGE,
  customReadingRange: CustomReadingRange = DEFAULT_CUSTOM_READING_RANGE,
): TrainingNote[] {
  return getReadingRange(range, customReadingRange).notes;
}

export const emptyReadingProgress = createEmptyModeProgress(READING_NOTES);
export const emptyPitchProgress = createEmptyModeProgress(PITCH_NOTES);

export const emptyProgress: PracticeProgress = {
  reading: emptyReadingProgress,
  pitch: emptyPitchProgress,
  history: [],
};
