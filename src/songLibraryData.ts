import { normalizeSong } from "./storage";
import type { Song, SongEvent } from "./types";

// Built-in practice songs. Every melody here is public domain: traditional
// tunes or works whose composers died well over a century ago (Beethoven,
// arrangements of traditional hymns and folk songs).

export type RawSong = {
  id: string;
  title: string;
  events: SongEvent[];
};

function note(noteId: string, duration: SongEvent["duration"] = "quarter"): SongEvent {
  return { noteIds: [noteId], duration };
}

const RAW_BUILT_IN_SONGS: RawSong[] = [
  {
    id: "builtin-ode-to-joy",
    title: "Ode to Joy (Beethoven)",
    events: [
      note("E4"),
      note("E4"),
      note("F4"),
      note("G4"),
      note("G4"),
      note("F4"),
      note("E4"),
      note("D4"),
      note("C4"),
      note("C4"),
      note("D4"),
      note("E4"),
      note("E4"),
      note("D4"),
      note("D4", "half"),
      note("E4"),
      note("E4"),
      note("F4"),
      note("G4"),
      note("G4"),
      note("F4"),
      note("E4"),
      note("D4"),
      note("C4"),
      note("C4"),
      note("D4"),
      note("E4"),
      note("D4"),
      note("C4"),
      note("C4", "half"),
    ],
  },
  {
    id: "builtin-twinkle-twinkle",
    title: "Twinkle, Twinkle, Little Star",
    events: [
      note("C4"),
      note("C4"),
      note("G4"),
      note("G4"),
      note("A4"),
      note("A4"),
      note("G4", "half"),
      note("F4"),
      note("F4"),
      note("E4"),
      note("E4"),
      note("D4"),
      note("D4"),
      note("C4", "half"),
    ],
  },
  {
    id: "builtin-mary-had-a-little-lamb",
    title: "Mary Had a Little Lamb",
    events: [
      note("E4"),
      note("D4"),
      note("C4"),
      note("D4"),
      note("E4"),
      note("E4"),
      note("E4", "half"),
      note("D4"),
      note("D4"),
      note("D4", "half"),
      note("E4"),
      note("G4"),
      note("G4", "half"),
      note("E4"),
      note("D4"),
      note("C4"),
      note("D4"),
      note("E4"),
      note("E4"),
      note("E4"),
      note("E4"),
      note("D4"),
      note("D4"),
      note("E4"),
      note("D4"),
      note("C4", "whole"),
    ],
  },
  {
    id: "builtin-amazing-grace",
    title: "Amazing Grace",
    events: [
      note("G3"),
      note("C4", "half"),
      note("E4", "eighth"),
      note("C4", "eighth"),
      note("E4", "half"),
      note("D4"),
      note("C4", "half"),
      note("A3"),
      note("G3", "half"),
      note("G3"),
      note("C4", "half"),
      note("E4", "eighth"),
      note("C4", "eighth"),
      note("E4", "half"),
      note("D4"),
      note("G4", "whole"),
    ],
  },
  {
    id: "builtin-when-the-saints",
    title: "When the Saints Go Marching In",
    events: [
      note("C4"),
      note("E4"),
      note("F4"),
      note("G4", "whole"),
      note("C4"),
      note("E4"),
      note("F4"),
      note("G4", "whole"),
      note("C4"),
      note("E4"),
      note("F4"),
      note("G4", "half"),
      note("E4"),
      note("C4"),
      note("E4"),
      note("D4", "whole"),
    ],
  },
  {
    id: "builtin-fur-elise",
    title: "Fur Elise, opening (Beethoven)",
    events: [
      note("E5", "eighth"),
      note("D#5", "eighth"),
      note("E5", "eighth"),
      note("D#5", "eighth"),
      note("E5", "eighth"),
      note("B4", "eighth"),
      note("D5", "eighth"),
      note("C5", "eighth"),
      note("A4", "half"),
      note("C4", "eighth"),
      note("E4", "eighth"),
      note("A4", "eighth"),
      note("B4", "half"),
      note("E4", "eighth"),
      note("G#4", "eighth"),
      note("B4", "eighth"),
      note("C5", "half"),
    ],
  },
];

export function buildBuiltInSongs(rawSongs: RawSong[]): Song[] {
  return rawSongs.map((raw) => {
    const song = normalizeSong(raw, "builtin");
    if (!song) {
      throw new Error(`Built-in song failed validation: ${raw.id}`);
    }
    return song;
  });
}

export const BUILT_IN_SONGS: Song[] = buildBuiltInSongs(RAW_BUILT_IN_SONGS);

export function getSongById(songs: Song[], songId: string): Song | undefined {
  return songs.find((song) => song.id === songId);
}
