import type { NoteName, PracticeProgress, TrainingNote } from "./types";

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

export const ANSWER_OPTIONS: NoteName[] = ["C", "D", "E", "F", "G"];

export const emptyProgress: PracticeProgress = {
  totalAttempts: 0,
  totalCorrect: 0,
  bestRoundScore: 0,
  sessionsCompleted: 0,
  noteStats: STARTER_NOTES.reduce<Record<string, { attempts: number; correct: number }>>(
    (stats, note) => {
      stats[note.id] = { attempts: 0, correct: 0 };
      return stats;
    },
    {},
  ),
};

export function getRandomNote(previousNoteId?: string): TrainingNote {
  const availableNotes =
    STARTER_NOTES.length > 1
      ? STARTER_NOTES.filter((note) => note.id !== previousNoteId)
      : STARTER_NOTES;

  return availableNotes[Math.floor(Math.random() * availableNotes.length)];
}

export function getNoteAccuracy(progress: PracticeProgress, noteId: string): number {
  const stat = progress.noteStats[noteId];
  if (!stat || stat.attempts === 0) {
    return 0;
  }

  return Math.round((stat.correct / stat.attempts) * 100);
}
