import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_TIME_SIGNATURE, compareSongsByDifficulty } from "../songEngine";
import { BUILT_IN_SONGS } from "../songLibraryData";
import SongLibrary from "./SongLibrary";

describe("SongLibrary", () => {
  it("lists every built-in song with note counts", () => {
    render(<SongLibrary songs={BUILT_IN_SONGS} songProgress={{}} onOpenSong={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Song library" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Practice" })).toHaveLength(BUILT_IN_SONGS.length);
    const odeToJoyHeading = screen.getByText("Ode to Joy (Beethoven)");
    const odeToJoyCard = odeToJoyHeading.closest(".song-card");
    expect(odeToJoyCard).not.toBeNull();
    expect(odeToJoyCard).toHaveTextContent(/30 notes \| Treble clef/);
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

  it("shows a non-default time signature for 3/4 songs", () => {
    render(<SongLibrary songs={BUILT_IN_SONGS} songProgress={{}} onOpenSong={vi.fn()} />);

    expect(screen.getByText(/Amazing Grace/)).toBeInTheDocument();
    // Amazing Grace and Silent Night are both traditionally 3/4.
    expect(screen.getAllByText(/3\/4 time/).length).toBeGreaterThanOrEqual(2);
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
            timeSignature: DEFAULT_TIME_SIGNATURE,
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

  it("opens the chosen song from the sorted list", () => {
    const onOpenSong = vi.fn();
    render(<SongLibrary songs={BUILT_IN_SONGS} songProgress={{}} onOpenSong={onOpenSong} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Practice" })[0]!);
    // The list is sorted easiest-first, so the first card is whichever built-in
    // song that same comparator ranks first.
    const easiestSong = [...BUILT_IN_SONGS].sort(compareSongsByDifficulty)[0];
    expect(onOpenSong).toHaveBeenCalledWith(easiestSong);
  });

  it("shows difficulty chips and note ranges, ordered easiest to hardest", () => {
    const { container } = render(<SongLibrary songs={BUILT_IN_SONGS} songProgress={{}} onOpenSong={vi.fn()} />);

    expect(screen.getAllByText("Beginner").length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText("Intermediate").length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText("Advanced").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/14 notes \| Treble clef \| C4-A4 \| 4\/4 time/)).toBeInTheDocument();

    const chips = [...container.querySelectorAll(".difficulty-chip")].map((chip) => chip.textContent);
    const firstAdvanced = chips.indexOf("Advanced");
    const lastBeginner = chips.lastIndexOf("Beginner");
    expect(lastBeginner).toBeLessThan(firstAdvanced);
  });
});
