import type { ModeProgress, NoteName, PitchNote, PracticeProgress, ReadingNoteName, TrainingNote } from "./types";

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

export const emptyProgress: PracticeProgress = {
  reading: emptyReadingProgress,
  pitch: emptyPitchProgress,
  history: [],
};
