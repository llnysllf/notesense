// Importing a MIDI file.
//
// Everything happens in this tab: the file is read with FileReader, parsed in
// memory, previewed, and saved to local storage only when the learner says so.
// Nothing is uploaded, and there is no step where it could be — the bytes never
// leave the page.
//
// The preview is not decoration. A MIDI file records a performance and a song
// records something readable, so the mapping loses things; the learner sees
// what it will cost before agreeing to it.

import { useCallback, useState } from "react";
import { loadImportedSongs, normalizeSong, saveImportedSongs } from "../storage";
import {
  describeImport,
  midiToSong,
  parseMidiFile,
  MAX_IMPORTED_SONGS,
  MIN_SONG_EVENTS,
  type HandSelection,
  type MidiImportPreview,
  type MidiImportView,
  type ParsedMidiFile,
  type QuantizeGrid,
  type Song,
} from "../types";

const MAX_TRANSPOSE = 24;

export function useMidiImport(onSongsChange?: (songs: Song[]) => void): MidiImportView {
  const [file, setFile] = useState<ParsedMidiFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Song[]>(() => loadImportedSongs());
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [trackIndex, setTrackIndex] = useState<number | undefined>(undefined);
  const [channel, setChannel] = useState<number | undefined>(undefined);
  const [grid, setGrid] = useState<QuantizeGrid>("sixteenth");
  const [hand, setHand] = useState<HandSelection>("both");
  const [transpose, setTranspose] = useState(0);

  const reset = useCallback(() => {
    setTrackIndex(undefined);
    setChannel(undefined);
    setGrid("sixteenth");
    setHand("both");
    setTranspose(0);
    setSavedMessage(null);
  }, []);

  const openFile = useCallback(
    (selected: File) => {
      setError(null);
      setSavedMessage(null);
      setFileName(selected.name);

      const reader = new FileReader();
      reader.onerror = () => {
        setFile(null);
        setError("That file could not be read.");
      };
      reader.onload = () => {
        const buffer = reader.result;
        if (!(buffer instanceof ArrayBuffer)) {
          setFile(null);
          setError("That file could not be read.");
          return;
        }
        const result = parseMidiFile(new Uint8Array(buffer));
        if (!result.ok) {
          setFile(null);
          setError(result.error);
          return;
        }
        setFile(result.file);
        reset();
      };
      reader.readAsArrayBuffer(selected);
    },
    [reset],
  );

  const title = fileName.replace(/\.[^.]+$/, "") || "Imported piece";
  const preview: MidiImportPreview | null = file
    ? midiToSong(file, {
        ...(trackIndex === undefined ? {} : { trackIndex }),
        ...(channel === undefined ? {} : { channel }),
        grid,
        hand,
        transpose,
        title,
      })
    : null;

  const save = useCallback(() => {
    if (!preview || preview.song.events.length === 0) return;
    if (saved.length >= MAX_IMPORTED_SONGS) {
      setSavedMessage(`You can keep ${MAX_IMPORTED_SONGS} imported pieces. Remove one to add another.`);
      return;
    }

    // Saved through the same normalizer the library reads back with, so the two
    // cannot disagree. Skipping this would let the app say "saved" about a piece
    // that quietly vanishes on reload — the worst kind of success message.
    const song = normalizeSong({ ...preview.song, id: `imported-${Date.now()}` }, "imported");
    if (!song) {
      setSavedMessage(
        `That selection is too short to practise. A piece needs at least ${MIN_SONG_EVENTS} notes or chords.`,
      );
      return;
    }

    const next = [...saved, song];
    setSaved(next);
    onSongsChange?.(next);
    setSavedMessage(
      saveImportedSongs(next)
        ? `Saved to your songs as "${song.title}".`
        : "That piece could not be saved on this device.",
    );
  }, [onSongsChange, preview, saved]);

  const remove = useCallback(
    (songId: string) => {
      const next = saved.filter((song) => song.id !== songId);
      setSaved(next);
      saveImportedSongs(next);
      onSongsChange?.(next);
      setSavedMessage(null);
    },
    [onSongsChange, saved],
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setFileName("");
    setError(null);
    reset();
  }, [reset]);

  return {
    file,
    fileName,
    error,
    preview,
    summary: preview ? describeImport(preview) : undefined,
    saved,
    savedMessage,
    trackIndex,
    channel,
    grid,
    hand,
    transpose,
    openFile,
    clearFile,
    setTrackIndex,
    setChannel,
    setGrid,
    setHand,
    setTranspose: (value) => setTranspose(Math.max(-MAX_TRANSPOSE, Math.min(MAX_TRANSPOSE, Math.round(value)))),
    save,
    remove,
  };
}
