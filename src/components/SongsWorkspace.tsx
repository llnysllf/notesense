import SongLibrary from "./SongLibrary";
import SongPlayer from "./SongPlayer";
import { BUILT_IN_SONGS } from "../songLibraryData";
import type { SongPlaythrough, SongPlaythroughSummary, SongSessionStatus } from "../songEngine";
import type { Song, SongProgress } from "../types";
import "./songs.css";

export type SongsWorkspaceSession = {
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

type SongsWorkspaceProps = {
  songSession: SongsWorkspaceSession;
};

function SongsWorkspace({ songSession }: SongsWorkspaceProps) {
  if (songSession.activeSong && songSession.playthrough) {
    return (
      <SongPlayer
        song={songSession.activeSong}
        playthrough={songSession.playthrough}
        status={songSession.status}
        summary={songSession.summary}
        songProgress={songSession.songProgress}
        storageWarning={songSession.storageWarning}
        onAnswer={songSession.answerCurrentEvent}
        onRestart={songSession.restartSong}
        onExit={songSession.closeSong}
      />
    );
  }

  return (
    <section className="practice-panel" aria-label="Song library">
      <SongLibrary songs={BUILT_IN_SONGS} songProgress={songSession.songProgress} onOpenSong={songSession.openSong} />
    </section>
  );
}

export default SongsWorkspace;
