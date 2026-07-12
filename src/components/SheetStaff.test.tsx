import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Song } from "@notesense/shared";
import { DEFAULT_TIME_SIGNATURE } from "@notesense/shared";
import SheetStaff from "./SheetStaff";

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "builtin-test",
    title: "Test Song",
    source: "builtin",
    clef: "treble",
    timeSignature: DEFAULT_TIME_SIGNATURE,
    events: [
      { noteIds: ["C4"], duration: "quarter" },
      { noteIds: ["D4"], duration: "half" },
      { noteIds: ["E4"], duration: "whole" },
      { noteIds: ["F#4"], duration: "eighth" },
    ],
    ...overrides,
  };
}

function getEventGroup(container: HTMLElement, index: number) {
  return container.querySelector(`[data-event-index="${index}"]`);
}

describe("SheetStaff", () => {
  it("describes the sheet, time signature, and current event for screen readers", () => {
    render(<SheetStaff song={makeSong()} currentIndex={1} />);

    expect(
      screen.getByRole("img", {
        name: "Sheet music for Test Song in 4/4 time, event 2 of 4. Current: D4, half note.",
      }),
    ).toBeInTheDocument();
  });

  it("shows the time signature on every staff system", () => {
    const longSong = makeSong({
      timeSignature: { beatsPerMeasure: 3, beatUnit: "quarter" },
      events: Array.from({ length: 15 }, () => ({ noteIds: ["C4"], duration: "quarter" as const })),
    });
    const { container } = render(<SheetStaff song={longSong} currentIndex={0} />);

    expect(container.querySelectorAll(".sheet-time-signature")).toHaveLength(4); // 2 systems x (numerator + denominator)
    const glyphs = [...container.querySelectorAll(".sheet-time-signature")].map((el) => el.textContent);
    expect(glyphs).toEqual(["3", "4", "3", "4"]);
  });

  it("draws a barline at every measure boundary but never before the first note", () => {
    const song = makeSong({
      events: Array.from({ length: 9 }, () => ({ noteIds: ["C4"], duration: "quarter" as const })),
    });
    const { container } = render(<SheetStaff song={song} currentIndex={0} />);

    // 4/4, quarter notes: measures start at events 0, 4, 8; only 4 and 8 draw a barline.
    expect(getEventGroup(container, 0)!.querySelector("[data-barline]")).toBeNull();
    expect(getEventGroup(container, 1)!.querySelector("[data-barline]")).toBeNull();
    expect(getEventGroup(container, 4)!.querySelector("[data-barline]")).not.toBeNull();
    expect(getEventGroup(container, 8)!.querySelector("[data-barline]")).not.toBeNull();
  });

  it("draws barlines for a 3/4 waltz and a compound 6/8 meter", () => {
    const waltz = makeSong({
      timeSignature: { beatsPerMeasure: 3, beatUnit: "quarter" },
      events: Array.from({ length: 6 }, () => ({ noteIds: ["C4"], duration: "quarter" as const })),
    });
    const { container: waltzContainer } = render(<SheetStaff song={waltz} currentIndex={0} />);
    expect(waltzContainer.querySelectorAll("[data-barline]")).toHaveLength(1); // one barline before event 3

    const jig = makeSong({
      timeSignature: { beatsPerMeasure: 6, beatUnit: "eighth" },
      events: Array.from({ length: 12 }, () => ({ noteIds: ["C4"], duration: "eighth" as const })),
    });
    const { container: jigContainer } = render(<SheetStaff song={jig} currentIndex={0} />);
    expect(jigContainer.querySelectorAll("[data-barline]")).toHaveLength(1); // one barline before event 6
  });

  it("marks done, current, and upcoming events with a single cursor caret", () => {
    const { container } = render(<SheetStaff song={makeSong()} currentIndex={1} />);

    expect(getEventGroup(container, 0)).toHaveClass("done");
    expect(getEventGroup(container, 1)).toHaveClass("current");
    expect(getEventGroup(container, 2)).toHaveClass("upcoming");
    expect(container.querySelectorAll(".sheet-cursor")).toHaveLength(1);
    expect(getEventGroup(container, 1)!.querySelector(".sheet-cursor")).not.toBeNull();
    // No filled box may cover the staff lines behind the current event.
    expect(container.querySelector(".sheet-current-highlight")).toBeNull();
  });

  it("flags a wrong answer on the current event only", () => {
    const { container } = render(<SheetStaff song={makeSong()} currentIndex={0} currentStatus="wrong" />);

    expect(getEventGroup(container, 0)).toHaveClass("current", "wrong");
    expect(getEventGroup(container, 1)).not.toHaveClass("wrong");
  });

  it("renders rhythm glyphs per duration", () => {
    const { container } = render(<SheetStaff song={makeSong()} currentIndex={0} />);

    const quarter = getEventGroup(container, 0)!;
    const half = getEventGroup(container, 1)!;
    const whole = getEventGroup(container, 2)!;
    const eighth = getEventGroup(container, 3)!;

    expect(quarter.querySelector(".sheet-stem")).not.toBeNull();
    expect(quarter.querySelector(".sheet-note-head")).not.toHaveClass("hollow");
    expect(half.querySelector(".sheet-note-head")).toHaveClass("hollow");
    expect(half.querySelector(".sheet-stem")).not.toBeNull();
    expect(whole.querySelector(".sheet-stem")).toBeNull();
    expect(whole.querySelector(".sheet-note-head")).toHaveClass("hollow");
    expect(eighth.querySelector(".sheet-flag")).not.toBeNull();
  });

  it("draws an accidental for sharp notes", () => {
    const { container } = render(<SheetStaff song={makeSong()} currentIndex={3} />);

    const sharpEvent = getEventGroup(container, 3)!;
    expect(sharpEvent.querySelector(".sheet-accidental")).toHaveTextContent("♯");
  });

  it("stacks chord notes on a shared stem", () => {
    const chordSong = makeSong({
      events: [
        { noteIds: ["C4", "E4", "G4"], duration: "quarter" },
        { noteIds: ["D4"], duration: "quarter" },
        { noteIds: ["E4"], duration: "quarter" },
        { noteIds: ["F4"], duration: "quarter" },
      ],
    });
    const { container } = render(<SheetStaff song={chordSong} currentIndex={0} />);

    const chord = getEventGroup(container, 0)!;
    expect(chord.querySelectorAll(".sheet-note-head")).toHaveLength(3);
    expect(chord.querySelectorAll(".sheet-stem")).toHaveLength(1);
  });

  it("draws ledger lines for notes outside the staff without clipping them into the next system", () => {
    const lowSong = makeSong({
      events: [
        { noteIds: ["C4"], duration: "quarter" },
        { noteIds: ["A3"], duration: "quarter" },
        { noteIds: ["G3"], duration: "quarter" },
        { noteIds: ["F3"], duration: "quarter" },
      ],
    });
    const { container } = render(<SheetStaff song={lowSong} currentIndex={0} />);

    // C4 below the treble staff needs one ledger line inside its event group.
    const c4Event = getEventGroup(container, 0)!;
    expect(c4Event.querySelectorAll(".staff-line").length).toBeGreaterThanOrEqual(1);

    // The lowest note (F3, three ledger lines below the staff) plus its
    // cursor caret must stay inside the single system's height.
    const f3Event = getEventGroup(container, 3)!;
    const noteHeadY = Number(f3Event.querySelector(".sheet-note-head")!.getAttribute("cy"));
    const systemHeight = Number(container.querySelector("svg")!.getAttribute("viewBox")!.split(" ")[3]);
    expect(noteHeadY).toBeLessThan(systemHeight);
  });

  it("renders the whole song statically across systems and never moves notes", () => {
    const longSong = makeSong({
      events: Array.from({ length: 30 }, (_, index) => ({
        noteIds: [index % 2 === 0 ? "C4" : "E4"],
        duration: "quarter" as const,
      })),
    });
    const { container, rerender } = render(<SheetStaff song={longSong} currentIndex={0} />);

    // Every event is on the sheet, split into 12-per-system rows.
    expect(container.querySelectorAll("[data-event-index]")).toHaveLength(30);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 800 630");

    const positionOf = (index: number) =>
      getEventGroup(container, index)!.querySelector(".sheet-note-head")!.getAttribute("cx");
    const before = [positionOf(0), positionOf(9), positionOf(15)];

    rerender(<SheetStaff song={longSong} currentIndex={15} />);
    expect([positionOf(0), positionOf(9), positionOf(15)]).toEqual(before);
    expect(getEventGroup(container, 15)!.querySelector(".sheet-cursor")).not.toBeNull();
  });

  it("renders a bass clef song with the bass symbol", () => {
    const bassSong = makeSong({
      clef: "bass",
      timeSignature: DEFAULT_TIME_SIGNATURE,
      events: [
        { noteIds: ["C3"], duration: "quarter" },
        { noteIds: ["D3"], duration: "quarter" },
        { noteIds: ["E3"], duration: "quarter" },
        { noteIds: ["F3"], duration: "quarter" },
      ],
    });
    const { container } = render(<SheetStaff song={bassSong} currentIndex={0} />);

    expect(container.querySelector(".bass-clef")).not.toBeNull();
  });
});
