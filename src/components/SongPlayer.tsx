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
  const best = songProgress[song.id]?.bestAccuracy;

  return (
    <section className="practice-panel song-player" aria-label={`Song practice: ${song.title}`}>
      <div className="song-player-header">
        <div>
          <h3>{song.title}</h3>
          <p className="song-meta">
            {isComplete ? "Song complete." : currentEvent ? `Play: ${describeSongEvent(currentEvent)}` : "Ready."}
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
            disabled={isComplete}
            isCorrect={status === "wrong" ? false : undefined}
            onKeySelect={(noteId) => onAnswer([noteId])}
          />
        )}
      </div>
    </section>
  );
}

export default SongPlayer;
