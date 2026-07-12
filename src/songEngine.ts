import type { Song, SongEvent } from "./types";

export { compareSongsByDifficulty, getSongDifficulty, getSongNoteRange } from "./storage";

// Pure playthrough logic for song sheet reading. Framework-free, like
// practiceEngine.ts: the hook layer owns timers, audio, and persistence.

export type SongSessionStatus = "idle" | "wrong" | "complete";

export type SongPlaythrough = {
  songId: string;
  index: number;
  attempts: number;
  correctEvents: number;
  mistakesByEvent: Record<number, number>;
  startedAt: string;
  finishedAt?: string;
};

export type SongAnswerResult = {
  next: SongPlaythrough;
  isCorrect: boolean;
  isComplete: boolean;
};

export type SongPlaythroughSummary = {
  accuracy: number;
  attempts: number;
  correctEvents: number;
  totalEvents: number;
  completed: boolean;
  durationSeconds: number;
};

export function startPlaythrough(song: Song, now: Date = new Date()): SongPlaythrough {
  return {
    songId: song.id,
    index: 0,
    attempts: 0,
    correctEvents: 0,
    mistakesByEvent: {},
    startedAt: now.toISOString(),
  };
}

// A song answer is correct when the selected keys are exactly the event's
// notes — same ids, nothing missing, nothing extra. Order never matters.
export function checkAnswer(event: SongEvent, selectedNoteIds: string[]): boolean {
  if (selectedNoteIds.length !== event.noteIds.length) return false;

  const expected = new Set(event.noteIds);
  return selectedNoteIds.every((noteId) => expected.has(noteId));
}

export function getCurrentEvent(song: Song, playthrough: SongPlaythrough): SongEvent | undefined {
  return song.events[playthrough.index];
}

export function applyAnswer(
  playthrough: SongPlaythrough,
  song: Song,
  selectedNoteIds: string[],
  now: Date = new Date(),
): SongAnswerResult {
  const event = getCurrentEvent(song, playthrough);
  if (!event || playthrough.finishedAt) {
    return { next: playthrough, isCorrect: false, isComplete: Boolean(playthrough.finishedAt) };
  }

  const isCorrect = checkAnswer(event, selectedNoteIds);
  const attempts = playthrough.attempts + 1;

  if (!isCorrect) {
    return {
      next: {
        ...playthrough,
        attempts,
        mistakesByEvent: {
          ...playthrough.mistakesByEvent,
          [playthrough.index]: (playthrough.mistakesByEvent[playthrough.index] ?? 0) + 1,
        },
      },
      isCorrect: false,
      isComplete: false,
    };
  }

  const nextIndex = playthrough.index + 1;
  const isComplete = nextIndex >= song.events.length;

  return {
    next: {
      ...playthrough,
      index: nextIndex,
      attempts,
      correctEvents: playthrough.correctEvents + 1,
      ...(isComplete ? { finishedAt: now.toISOString() } : {}),
    },
    isCorrect: true,
    isComplete,
  };
}

export function getPlaythroughSummary(playthrough: SongPlaythrough, song: Song): SongPlaythroughSummary {
  const accuracy =
    playthrough.attempts === 0 ? 0 : Math.round((playthrough.correctEvents / playthrough.attempts) * 100);
  const finishedMs = playthrough.finishedAt ? Date.parse(playthrough.finishedAt) : Date.now();
  const startedMs = Date.parse(playthrough.startedAt);
  const durationSeconds =
    Number.isFinite(startedMs) && Number.isFinite(finishedMs)
      ? Math.max(0, Math.round((finishedMs - startedMs) / 1000))
      : 0;

  return {
    accuracy,
    attempts: playthrough.attempts,
    correctEvents: playthrough.correctEvents,
    totalEvents: song.events.length,
    completed: Boolean(playthrough.finishedAt),
    durationSeconds,
  };
}

// Human label for an event, reused by the sheet aria description and the
// player prompt ("C4 and E4, quarter note").
export function describeSongEvent(event: SongEvent): string {
  const notes =
    event.noteIds.length === 1
      ? event.noteIds[0]
      : `${event.noteIds.slice(0, -1).join(", ")} and ${event.noteIds[event.noteIds.length - 1]}`;

  return `${notes}, ${event.duration} note`;
}
