import { PITCH_NOTES, STARTER_NOTES } from "./noteData";
import type { ModeProgress, PitchNote, PracticeMode, PracticeProgress, RoundLength, SessionSummary, TrainingNote } from "./types";

export const ROUND_LENGTHS: RoundLength[] = [30, 60, 90];

type SelectNoteOptions = {
  previousNoteId?: string;
  progress?: ModeProgress;
  rng?: () => number;
  useAdaptive?: boolean;
};

export function formatAccuracy(correct: number, attempts: number): string {
  if (attempts === 0) {
    return "0%";
  }

  return `${Math.round((correct / attempts) * 100)}%`;
}

export function getModeLabel(mode: PracticeMode): string {
  return mode === "reading" ? "Note reading" : "Pitch training";
}

export function getNoteAccuracy(progress: ModeProgress, noteId: string): number {
  const stat = progress.noteStats[noteId];
  if (!stat || stat.attempts === 0) {
    return 0;
  }

  return Math.round((stat.correct / stat.attempts) * 100);
}

export function getFocusItems(mode: PracticeMode, modeProgress: ModeProgress) {
  const sourceNotes = mode === "reading" ? STARTER_NOTES : PITCH_NOTES;

  return sourceNotes
    .map((note) => ({
      note,
      accuracy: getNoteAccuracy(modeProgress, note.id),
      attempts: modeProgress.noteStats[note.id]?.attempts ?? 0,
    }))
    .filter((entry) => entry.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
}

export function getPracticeWeight(noteId: string, progress?: ModeProgress): number {
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
  const rng = options.rng ?? Math.random;

  if (!options.useAdaptive) {
    return availableNotes[Math.floor(rng() * availableNotes.length)];
  }

  const weightedNotes = availableNotes.map((note) => ({
    note,
    weight: getPracticeWeight(note.id, options.progress),
  }));
  const totalWeight = weightedNotes.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * totalWeight;

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

export function createSessionSummary(
  mode: PracticeMode,
  progress: PracticeProgress,
  score: number,
  attempts: number,
  bestStreak: number,
): SessionSummary {
  const focusItem = getFocusItems(mode, progress[mode]).find((entry) => entry.accuracy < 85)?.note.id;
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  const suggestion =
    attempts === 0
      ? "Next: start with a short round and answer at least five prompts."
      : focusItem
        ? `Next: spend one short round on ${focusItem}.`
        : "Next: keep the same range and try to beat this score.";

  return {
    mode,
    score,
    attempts,
    accuracy,
    bestStreak,
    focusItem,
    suggestion,
  };
}
