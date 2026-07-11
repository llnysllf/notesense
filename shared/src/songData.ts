// Framework-agnostic song data contract: types, caps, validation, and
// normalization for built-in and imported songs. Follows the same
// untrusted-input posture as practiceData.ts — anything read from storage
// or a file goes through normalization before the app trusts it.

export type NoteDuration = "whole" | "half" | "quarter" | "eighth";

export type SongEvent = {
  noteIds: string[];
  duration: NoteDuration;
};

export type SongClef = "treble" | "bass";

export type SongSource = "builtin" | "imported";

export type Song = {
  id: string;
  title: string;
  source: SongSource;
  clef: SongClef;
  events: SongEvent[];
};

export type SongProgressEntry = {
  bestAccuracy: number;
  completions: number;
  lastPlayedAt: string;
};

export type SongProgress = Record<string, SongProgressEntry>;

export const MAX_SONG_EVENTS = 300;
export const MIN_SONG_EVENTS = 4;
export const MAX_CHORD_SIZE = 4;
export const MAX_IMPORTED_SONGS = 20;
export const MAX_SONG_TITLE_LENGTH = 80;
export const MAX_MIDI_FILE_BYTES = 512 * 1024;

export const NOTE_DURATIONS: NoteDuration[] = ["whole", "half", "quarter", "eighth"];

const NOTE_ID_PATTERN = /^([A-G]#?)(-?\d)$/;
const SEMITONE_BY_NAME: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const LOWEST_PIANO_MIDI = 21; // A0
const HIGHEST_PIANO_MIDI = 108; // C8
const MIDDLE_C_MIDI = 60; // C4

// Returns the MIDI number for ids like "C4" or "F#3", or undefined for
// anything that is not an 88-key piano note.
export function noteIdToMidi(noteId: unknown): number | undefined {
  if (typeof noteId !== "string") return undefined;

  const match = NOTE_ID_PATTERN.exec(noteId);
  if (!match?.[1] || match[2] === undefined) return undefined;

  const semitone = SEMITONE_BY_NAME[match[1]];
  if (semitone === undefined) return undefined;

  const octave = Number(match[2]);
  const midi = (octave + 1) * 12 + semitone;

  return midi >= LOWEST_PIANO_MIDI && midi <= HIGHEST_PIANO_MIDI ? midi : undefined;
}

export function isValidNoteId(noteId: unknown): noteId is string {
  return noteIdToMidi(noteId) !== undefined;
}

function isNoteDuration(value: unknown): value is NoteDuration {
  return typeof value === "string" && (NOTE_DURATIONS as string[]).includes(value);
}

function normalizeSongEvent(value: unknown): SongEvent | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const candidate = value as { noteIds?: unknown; duration?: unknown };
  if (!Array.isArray(candidate.noteIds)) return undefined;

  const uniqueIds = [...new Set(candidate.noteIds.filter(isValidNoteId))];
  if (uniqueIds.length === 0 || uniqueIds.length > MAX_CHORD_SIZE) return undefined;

  uniqueIds.sort((a, b) => (noteIdToMidi(a) ?? 0) - (noteIdToMidi(b) ?? 0));

  return {
    noteIds: uniqueIds,
    duration: isNoteDuration(candidate.duration) ? candidate.duration : "quarter",
  };
}

export function deriveSongClef(events: SongEvent[]): SongClef {
  const midis = events
    .flatMap((event) => event.noteIds)
    .map((noteId) => noteIdToMidi(noteId) ?? MIDDLE_C_MIDI)
    .sort((a, b) => a - b);

  if (midis.length === 0) return "treble";

  const median = midis[Math.floor(midis.length / 2)] ?? MIDDLE_C_MIDI;
  return median >= MIDDLE_C_MIDI ? "treble" : "bass";
}

// Normalizes an untrusted song-shaped value. Returns undefined when the
// value cannot become a playable song (too few valid events, no title).
export function normalizeSong(value: unknown, source: SongSource): Song | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const candidate = value as { id?: unknown; title?: unknown; events?: unknown };
  if (typeof candidate.title !== "string" || !Array.isArray(candidate.events)) return undefined;

  const title = candidate.title.trim().slice(0, MAX_SONG_TITLE_LENGTH);
  if (title.length === 0) return undefined;

  const events = candidate.events
    .map(normalizeSongEvent)
    .filter((event): event is SongEvent => event !== undefined)
    .slice(0, MAX_SONG_EVENTS);
  if (events.length < MIN_SONG_EVENTS) return undefined;

  const id =
    typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id.trim().slice(0, 120)
      : `${source}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return { id, title, source, clef: deriveSongClef(events), events };
}

export function normalizeImportedSongs(value: unknown): Song[] {
  if (typeof value !== "object" || value === null) return [];

  const candidate = value as { songs?: unknown };
  if (!Array.isArray(candidate.songs)) return [];

  const seenIds = new Set<string>();
  const songs: Song[] = [];

  for (const entry of candidate.songs) {
    const song = normalizeSong(entry, "imported");
    if (!song || seenIds.has(song.id)) continue;

    seenIds.add(song.id);
    songs.push(song);
    if (songs.length >= MAX_IMPORTED_SONGS) break;
  }

  return songs;
}

function clampAccuracy(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function clampCount(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.round(numeric));
}

export function normalizeSongProgress(value: unknown): SongProgress {
  if (typeof value !== "object" || value === null) return {};

  const progress: SongProgress = {};

  for (const [songId, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) continue;

    const candidate = entry as { bestAccuracy?: unknown; completions?: unknown; lastPlayedAt?: unknown };
    const lastPlayedAt = typeof candidate.lastPlayedAt === "string" ? candidate.lastPlayedAt : "";
    if (Number.isNaN(Date.parse(lastPlayedAt))) continue;

    progress[songId] = {
      bestAccuracy: clampAccuracy(candidate.bestAccuracy),
      completions: clampCount(candidate.completions),
      lastPlayedAt,
    };
  }

  return progress;
}
