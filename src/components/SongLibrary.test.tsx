import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_SONGS } from "../songLibraryData";
import SongLibrary from "./SongLibrary";

describe("SongLibrary", () => {
  it("lists every built-in song with note counts", () => {
    render(<SongLibrary songs={BUILT_IN_SONGS} songProgress={{}} onOpenSong={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Song library" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Practice" })).toHaveLength(BUILT_IN_SONGS.length);
    expect(screen.getByText("Ode to Joy (Beethoven)")).toBeInTheDocument();
    expect(screen.getByText(/30 notes \| Treble clef/)).toBeInTheDocument();
  });

  it("shows saved progress and a not-played hint", () => {
    render(
      <SongLibrary
        songs={BUILT_IN_SONGS}
        songProgress={{
          "builtin-ode-to-joy": { bestAccuracy: 92, completions: 3, lastPlayedAt: "2026-07-11T00:00:00.000Z" },
        }}
        onOpenSong={vi.fn()}
      />,
    );

    expect(screen.getByText(/Best 92% \| Completed 3x/)).toBeInTheDocument();
    expect(screen.getAllByText(/Not played yet/).length).toBe(BUILT_IN_SONGS.length - 1);
  });

  it("labels bass clef songs", () => {
    render(
      <SongLibrary
        songs={[
          {
            id: "builtin-bass",
            title: "Bass Song",
            source: "builtin",
            clef: "bass",
            events: [
              { noteIds: ["C3"], duration: "quarter" },
              { noteIds: ["D3"], duration: "quarter" },
              { noteIds: ["E3"], duration: "quarter" },
              { noteIds: ["F3"], duration: "quarter" },
            ],
          },
        ]}
        songProgress={{}}
        onOpenSong={vi.fn()}
      />,
    );

    expect(screen.getByText(/4 notes \| Bass clef/)).toBeInTheDocument();
  });

  it("opens the chosen song", () => {
    const onOpenSong = vi.fn();
    render(<SongLibrary songs={BUILT_IN_SONGS} songProgress={{}} onOpenSong={onOpenSong} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Practice" })[0]!);
    expect(onOpenSong).toHaveBeenCalledWith(BUILT_IN_SONGS[0]);
  });
});
