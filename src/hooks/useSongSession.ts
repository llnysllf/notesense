import { useCallback, useEffect, useRef, useState } from "react";
import type { Song, SongProgress } from "../types";
import { playTone } from "../audio";
import { getNoteFrequency } from "../noteData";
import {
  applyAnswer,
  type SongSessionStatus,
  getCurrentEvent,
  getPlaythroughSummary,
  startPlaythrough,
  type SongPlaythrough,
  type SongPlaythroughSummary,
} from "../songEngine";
import { loadSongProgress, recordSongCompletion, saveSongProgress } from "../storage";

const WRONG_FEEDBACK_MS = 650;

export type { SongSessionStatus } from "../songEngine";

type UseSongSessionResult = {
  activeSong: Song | null;
  playthrough: SongPlaythrough | null;
  status: SongSessionStatus;
  summary: SongPlaythroughSummary | null;
  songProgress: SongProgress;
  storageWarning: boolean;
  openSong: (song: Song) => void;
  closeSong: () => void;
  restartSong: () => void;
  answerCurrentEvent: (noteIds: string[]) => void;
};

export function useSongSession(): UseSongSessionResult {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [playthrough, setPlaythrough] = useState<SongPlaythrough | null>(null);
  const [status, setStatus] = useState<SongSessionStatus>("idle");
  const [songProgress, setSongProgress] = useState<SongProgress>(() => loadSongProgress());
  const [storageWarning, setStorageWarning] = useState(false);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current !== undefined) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  const openSong = useCallback((song: Song) => {
    setActiveSong(song);
    setPlaythrough(startPlaythrough(song));
    setStatus("idle");
  }, []);

  const closeSong = useCallback(() => {
    setActiveSong(null);
    setPlaythrough(null);
    setStatus("idle");
  }, []);

  const restartSong = useCallback(() => {
    setActiveSong((song) => {
      if (song) {
        setPlaythrough(startPlaythrough(song));
        setStatus("idle");
      }
      return song;
    });
  }, []);

  const answerCurrentEvent = useCallback(
    (noteIds: string[]) => {
      if (!activeSong || !playthrough || status === "complete") return;

      const result = applyAnswer(playthrough, activeSong, noteIds);
      setPlaythrough(result.next);

      if (result.isCorrect) {
        const answered = getCurrentEvent(activeSong, playthrough);
        for (const noteId of answered?.noteIds ?? []) {
          const frequency = getNoteFrequency(noteId);
          if (frequency !== undefined) playTone(frequency);
        }
      }

      if (!result.isCorrect) {
        setStatus("wrong");
        if (wrongTimerRef.current !== undefined) clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = setTimeout(() => setStatus("idle"), WRONG_FEEDBACK_MS);
        return;
      }

      if (result.isComplete) {
        setStatus("complete");
        const summary = getPlaythroughSummary(result.next, activeSong);
        const nextProgress = recordSongCompletion(songProgress, activeSong.id, summary.accuracy);
        setSongProgress(nextProgress);
        if (!saveSongProgress(nextProgress)) setStorageWarning(true);
        return;
      }

      setStatus("idle");
    },
    [activeSong, playthrough, songProgress, status],
  );

  const summary =
    activeSong && playthrough && status === "complete" ? getPlaythroughSummary(playthrough, activeSong) : null;

  return {
    activeSong,
    playthrough,
    status,
    summary,
    songProgress,
    storageWarning,
    openSong,
    closeSong,
    restartSong,
    answerCurrentEvent,
  };
}
