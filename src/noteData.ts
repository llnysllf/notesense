import type { ModeProgress, NoteName, PitchNote, ReadingNoteName, TrainingNote } from "./types";

export const STARTER_NOTES: TrainingNote[] = [
  {
    id: "C4",
    name: "C",
    octave: 4,
    frequency: 261.63,
    staffY: 136,
    keyboardShortcut: "1",
  },
  {
    id: "D4",
    name: "D",
    octave: 4,
    frequency: 293.66,
    staffY: 128,
    keyboardShortcut: "2",
  },
  {
    id: "E4",
    name: "E",
    octave: 4,
    frequency: 329.63,
    staffY: 120,
    keyboardShortcut: "3",
  },
  {
    id: "F4",
    name: "F",
    octave: 4,
    frequency: 349.23,
    staffY: 112,
    keyboardShortcut: "4",
  },
  {
    id: "G4",
    name: "G",
    octave: 4,
    frequency: 392,
    staffY: 104,
    keyboardShortcut: "5",
  },
];

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

function createEmptyModeProgress(notes: Array<{ id: string }>): ModeProgress {
  return {
    totalAttempts: 0,
    totalCorrect: 0,
    bestRoundScore: 0,
    sessionsCompleted: 0,
    noteStats: notes.reduce<Record<string, { attempts: number; correct: number }>>(
      (stats, note) => {
        stats[note.id] = { attempts: 0, correct: 0 };
        return stats;
      },
      {},
    ),
  };
}

export const emptyReadingProgress = createEmptyModeProgress(STARTER_NOTES);
export const emptyPitchProgress = createEmptyModeProgress(PITCH_NOTES);

export const emptyProgress = {
  reading: emptyReadingProgress,
  pitch: emptyPitchProgress,
};

type SelectNoteOptions = {
  previousNoteId?: string;
  progress?: ModeProgress;
  useAdaptive?: boolean;
};

function getPracticeWeight(noteId: string, progress?: ModeProgress): number {
  const stat = progress?.noteStats[noteId];
  if (!stat || stat.attempts === 0) {
    return 4;
  }

  const misses = stat.attempts - stat.correct;
  const accuracy = stat.correct / stat.attempts;
  return 1 + (1 - accuracy) * 5 + Math.min(misses, 5) * 0.4;
}

function selectPracticeNote<TNote extends { id: string }>(notes: TNote[], options: SelectNoteOptions): TNote {
  const availableNotes = notes.length > 1 ? notes.filter((note) => note.id !== options.previousNoteId) : notes;

  if (!options.useAdaptive) {
    return availableNotes[Math.floor(Math.random() * availableNotes.length)];
  }

  const weightedNotes = availableNotes.map((note) => ({
    note,
    weight: getPracticeWeight(note.id, options.progress),
  }));
  const totalWeight = weightedNotes.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const entry of weightedNotes) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.note;
    }
  }

  return weightedNotes[weightedNotes.length - 1].note;
}

export function selectReadingNote(options: SelectNoteOptions = {}): TrainingNote {
  return selectPracticeNote(STARTER_NOTES, options);
}

export function selectPitchNote(options: SelectNoteOptions = {}): PitchNote {
  return selectPracticeNote(PITCH_NOTES, options);
}

export function getNoteAccuracy(progress: ModeProgress, noteId: string): number {
  const stat = progress.noteStats[noteId];
  if (!stat || stat.attempts === 0) {
    return 0;
  }

  return Math.round((stat.correct / stat.attempts) * 100);
}
