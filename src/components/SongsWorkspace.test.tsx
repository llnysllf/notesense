import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_SONGS } from "../songLibraryData";
import { startPlaythrough } from "../songEngine";
import SongsWorkspace, { type SongsWorkspaceSession } from "./SongsWorkspace";

vi.mock("./SongLibrary", () => ({ default: () => <p>Song library view</p> }));
vi.mock("./SongPlayer", () => ({ default: () => <p>Song player view</p> }));

function createSongSession(): SongsWorkspaceSession {
  return {
    songs: BUILT_IN_SONGS,
    activeSong: null,
    playthrough: null,
    status: "idle",
    summary: null,
    songProgress: {},
    storageWarning: false,
    openSong: vi.fn(),
    closeSong: vi.fn(),
    restartSong: vi.fn(),
    answerCurrentEvent: vi.fn(),
  };
}

describe("SongsWorkspace", () => {
  it("shows the library until a song is active", () => {
    render(<SongsWorkspace songSession={createSongSession()} />);
    expect(screen.getByText("Song library view")).toBeInTheDocument();
  });

  it("shows the player for an active playthrough", () => {
    const songSession = createSongSession();
    const song = BUILT_IN_SONGS[0];
    if (!song) throw new Error("Expected a built-in song.");
    songSession.activeSong = song;
    songSession.playthrough = startPlaythrough(song);

    render(<SongsWorkspace songSession={songSession} />);
    expect(screen.getByText("Song player view")).toBeInTheDocument();
  });
});
