import type { Song, SongProgress } from "../types";

type SongLibraryProps = {
  songs: Song[];
  songProgress: SongProgress;
  onOpenSong: (song: Song) => void;
};

function SongLibrary({ songs, songProgress, onOpenSong }: SongLibraryProps) {
  return (
    <div className="song-library">
      <h3>Song library</h3>
      <p className="song-library-hint">
        Read real melodies note by note. Pick a song and play each note on the piano as it is highlighted.
      </p>
      <ul className="song-list">
        {songs.map((song) => {
          const progress = songProgress[song.id];

          return (
            <li className="song-card" key={song.id}>
              <div className="song-card-info">
                <strong>{song.title}</strong>
                <span className="song-meta">
                  {song.events.length} notes | {song.clef === "treble" ? "Treble clef" : "Bass clef"}
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
