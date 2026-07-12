import type { Song, SongProgress } from "../types";
import { compareSongsByDifficulty, getSongDifficulty, getSongNoteRange, getTimeSignatureLabel } from "../songEngine";

type SongLibraryProps = {
  songs: Song[];
  songProgress: SongProgress;
  onOpenSong: (song: Song) => void;
};

const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;

function SongLibrary({ songs, songProgress, onOpenSong }: SongLibraryProps) {
  const sortedSongs = [...songs].sort(compareSongsByDifficulty);

  return (
    <div className="song-library">
      <h3>Song library</h3>
      <p className="song-library-hint">
        Read real melodies note by note. Pick a song and play each note on the piano as it is highlighted. Songs are
        ordered from easiest to hardest.
      </p>
      <ul className="song-list">
        {sortedSongs.map((song) => {
          const progress = songProgress[song.id];
          const difficulty = getSongDifficulty(song);
          const range = getSongNoteRange(song);

          return (
            <li className="song-card" key={song.id}>
              <div className="song-card-info">
                <div className="song-card-title">
                  <strong>{song.title}</strong>
                  <span className={`difficulty-chip difficulty-${difficulty}`}>{DIFFICULTY_LABELS[difficulty]}</span>
                </div>
                <span className="song-meta">
                  {song.events.length} notes | {song.clef === "treble" ? "Treble clef" : "Bass clef"} |{" "}
                  {range.lowestNoteId}-{range.highestNoteId} | {getTimeSignatureLabel(song.timeSignature)} time
                  {progress
                    ? ` | Best ${progress.bestAccuracy}% | Completed ${progress.completions}x`
                    : " | Not played yet"}
                </span>
              </div>
              <button className="secondary-button" type="button" onClick={() => onOpenSong(song)}>
                Practice
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SongLibrary;
