import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_TIME_SIGNATURE } from "../songEngine";
import type { Song } from "../types";
import { startPlaythrough, type SongPlaythrough } from "../songEngine";
import SongPlayer from "./SongPlayer";

const song: Song = {
  id: "builtin-player-test",
  title: "Player Test",
  source: "builtin",
  clef: "treble",
  timeSignature: DEFAULT_TIME_SIGNATURE,
  events: [
    { noteIds: ["C4"], duration: "quarter" },
    { noteIds: ["D4"], duration: "quarter" },
    { noteIds: ["E4"], duration: "quarter" },
    { noteIds: ["F4"], duration: "quarter" },
  ],
};

type PlayerProps = Parameters<typeof SongPlayer>[0];

function renderPlayer(overrides: Partial<PlayerProps> = {}) {
  const props: PlayerProps = {
    song,
    playthrough: startPlaythrough(song),
    status: "idle",
    summary: null,
    songProgress: {},
    storageWarning: false,
    onAnswer: vi.fn(),
    onRestart: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  };

  return { ...render(<SongPlayer {...props} />), props };
}

describe("SongPlayer", () => {
  it("shows the song title, current prompt, and progress tiles", () => {
    renderPlayer();

    expect(screen.getByRole("region", { name: "Song practice: Player Test" })).toBeInTheDocument();
    expect(screen.getByText("Play: C4, quarter note")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("sends tapped piano keys as answers", () => {
    const { props } = renderPlayer();

    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    expect(props.onAnswer).toHaveBeenCalledWith(["C4"]);
  });

  it("restarts and exits", () => {
    const { props } = renderPlayer();

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to songs" }));
    expect(props.onRestart).toHaveBeenCalledTimes(1);
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  it("shows the storage warning when persistence fails", () => {
    renderPlayer({ storageWarning: true });

    expect(screen.getByRole("status")).toHaveTextContent("Song progress is not being saved on this device right now.");
  });

  it("shows the completion summary instead of the keyboard", () => {
    const finished: SongPlaythrough = {
      ...startPlaythrough(song),
      index: 4,
      attempts: 5,
      correctEvents: 4,
      finishedAt: "2026-07-11T00:00:30.000Z",
    };

    renderPlayer({
      playthrough: finished,
      status: "complete",
      summary: {
        accuracy: 80,
        attempts: 5,
        correctEvents: 4,
        totalEvents: 4,
        completed: true,
        durationSeconds: 30,
      },
      songProgress: {
        "builtin-player-test": { bestAccuracy: 95, completions: 2, lastPlayedAt: "2026-07-11T00:00:00.000Z" },
      },
    });

    expect(screen.getByText("Finished with 80% accuracy.")).toBeInTheDocument();
    expect(screen.getByText(/4\/4 notes in 30s\. Best on this song: 95%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "88-key piano keyboard" })).not.toBeInTheDocument();
  });

  it("celebrates a perfect run", () => {
    renderPlayer({
      playthrough: { ...startPlaythrough(song), index: 4, attempts: 4, correctEvents: 4, finishedAt: "x" },
      status: "complete",
      summary: { accuracy: 100, attempts: 4, correctEvents: 4, totalEvents: 4, completed: true, durationSeconds: 12 },
    });

    expect(screen.getByText("Perfect run!")).toBeInTheDocument();
  });
});
