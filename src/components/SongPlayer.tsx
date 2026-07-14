import { useState } from "react";
import type { SongPlaythrough, SongPlaythroughSummary, SongSessionStatus } from "../songEngine";
import type { Song, SongProgress } from "../types";
import { describeSongEvent, getCurrentEvent } from "../songEngine";
import PianoKeyboard from "./PianoKeyboard";
import SheetStaff from "./SheetStaff";
import StatTile from "./StatTile";

type SongPlayerProps = {
  song: Song;
  playthrough: SongPlaythrough;
  status: SongSessionStatus;
  summary: SongPlaythroughSummary | null;
  songProgress: SongProgress;
  storageWarning: boolean;
  onAnswer: (noteIds: string[]) => void;
  onRestart: () => void;
  onExit: () => void;
};

function SongPlayer({
  song,
  playthrough,
  status,
  summary,
  songProgress,
  storageWarning,
  onAnswer,
  onRestart,
  onExit,
}: SongPlayerProps) {
  const currentEvent = getCurrentEvent(song, playthrough);
  const accuracy =
    playthrough.attempts === 0 ? 100 : Math.round((playthrough.correctEvents / playthrough.attempts) * 100);
  const isComplete = status === "complete";
  const isRest = Boolean(currentEvent?.isRest);
  const best = songProgress[song.id]?.bestAccuracy;

  // Chords need every key held down together before they count as an
  // answer, so taps accumulate here until they match the event's chord
  // size; a single-note event still answers on the first tap, unchanged.
  // Tracked alongside the event/status it belongs to so a new event or a
  // wrong-answer reset clears any partial chord without needing an effect.
  const [chordTracker, setChordTracker] = useState({ index: playthrough.index, status, heldNoteIds: [] as string[] });
  if (chordTracker.index !== playthrough.index || chordTracker.status !== status) {
    setChordTracker({ index: playthrough.index, status, heldNoteIds: [] });
  }
  const heldNoteIds = chordTracker.heldNoteIds;

  function handleKeySelect(noteId: string) {
    const expectedSize = currentEvent?.noteIds.length ?? 1;
    if (expectedSize <= 1) {
      onAnswer([noteId]);
      return;
    }

    if (heldNoteIds.includes(noteId)) return;
    const next = [...heldNoteIds, noteId];

    if (next.length >= expectedSize) {
      // Reset first, then notify the parent: onAnswer synchronously updates
      // playthrough state one level up, and calling it from inside this
      // setState updater (rather than as a separate call) confuses React
      // about which component is mid-render.
      setChordTracker({ index: playthrough.index, status, heldNoteIds: [] });
      onAnswer(next);
      return;
    }

    setChordTracker({ index: playthrough.index, status, heldNoteIds: next });
  }

  return (
    <section className="practice-panel song-player" aria-label={`Song practice: ${song.title}`}>
      <div className="song-player-header">
        <div>
          <h3>{song.title}</h3>
          <p className="song-meta">
            {isComplete
              ? "Song complete."
              : currentEvent
                ? isRest
                  ? "Rest — wait a beat."
                  : `Play: ${describeSongEvent(currentEvent)}`
                : "Ready."}
          </p>
        </div>
        <div className="song-player-actions">
          <button className="secondary-button" type="button" onClick={onRestart}>
            Restart
          </button>
          <button className="ghost-button" type="button" onClick={onExit}>
            Back to songs
          </button>
        </div>
      </div>

      {storageWarning && (
        <p className="data-status warning" role="status">
          Song progress is not being saved on this device right now.
        </p>
      )}

      <div className="round-strip" aria-label="Song progress">
        <StatTile label="Note" value={`${Math.min(playthrough.index + 1, song.events.length)}/${song.events.length}`} />
        <StatTile label="Accuracy" value={`${accuracy}%`} />
        <StatTile label="Mistakes" value={playthrough.attempts - playthrough.correctEvents} />
        <StatTile label="Best" value={best === undefined ? "-" : `${best}%`} />
      </div>

      <div className="staff-card song-sheet-card">
        <SheetStaff
          song={song}
          currentIndex={playthrough.index}
          currentStatus={status === "wrong" ? "wrong" : "idle"}
        />

        {isComplete && summary ? (
          <div className="song-summary" role="status">
            <strong>
              {summary.accuracy === 100 ? "Perfect run!" : `Finished with ${summary.accuracy}% accuracy.`}
            </strong>
            <p>
              {summary.correctEvents}/{summary.totalEvents} notes in {summary.durationSeconds}s. Best on this song:{" "}
              {best ?? summary.accuracy}%.
            </p>
            <button className="primary-button" type="button" onClick={onRestart}>
              Play again
            </button>
          </div>
        ) : (
          <PianoKeyboard
            disabled={isComplete || isRest}
            isCorrect={status === "wrong" ? false : undefined}
            rangeNoteIds={heldNoteIds.length > 0 ? new Set(heldNoteIds) : undefined}
            onKeySelect={handleKeySelect}
          />
        )}
      </div>
    </section>
  );
}

export default SongPlayer;
