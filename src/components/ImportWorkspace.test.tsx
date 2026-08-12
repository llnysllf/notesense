import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImportWorkspace from "./ImportWorkspace";
import { midiToSong, type MidiImportView, type ParsedMidiFile, type Song } from "../types";

const TICKS = 480;

const FILE: ParsedMidiFile = {
  format: 1,
  ticksPerQuarter: TICKS,
  notes: [60, 64, 67, 72].map((midi, index) => ({
    startTicks: index * TICKS,
    durationTicks: TICKS,
    midi,
    velocity: 80,
    channel: 0,
    trackIndex: 0,
  })),
  tempoChanges: [],
  meterChanges: [],
  tracks: [
    { index: 0, name: "Right hand", noteCount: 4, channels: [0], lowMidi: 60, highMidi: 72 },
    { index: 1, name: "Left hand", noteCount: 4, channels: [1], lowMidi: 40, highMidi: 55 },
  ],
  warnings: [],
};

const SAVED: Song = {
  id: "imported-1",
  title: "Minuet",
  source: "imported",
  clef: "treble",
  timeSignature: { beatsPerMeasure: 4, beatUnit: "quarter" },
  events: [
    { noteIds: ["C4"], duration: "quarter" },
    { noteIds: ["E4"], duration: "quarter" },
    { noteIds: ["G4"], duration: "quarter" },
    { noteIds: ["C5"], duration: "quarter" },
  ],
};

function renderImport(overrides: Partial<MidiImportView> = {}) {
  const importer: MidiImportView = {
    file: null,
    fileName: "",
    error: null,
    preview: null,
    summary: undefined,
    saved: [],
    savedMessage: null,
    trackIndex: undefined,
    channel: undefined,
    grid: "sixteenth",
    hand: "both",
    transpose: 0,
    openFile: vi.fn(),
    clearFile: vi.fn(),
    setTrackIndex: vi.fn(),
    setChannel: vi.fn(),
    setGrid: vi.fn(),
    setHand: vi.fn(),
    setTranspose: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
  render(<ImportWorkspace importer={importer} />);
  return importer;
}

describe("ImportWorkspace", () => {
  it("says where the file goes, and whose responsibility the rights are", () => {
    renderImport();

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/read in this tab and saved only on this device/i);
    expect(note).toHaveTextContent(/Nothing is uploaded/i);
    expect(note).toHaveTextContent(/right to use/i);
  });

  it("offers a file picker limited to MIDI", () => {
    renderImport();

    expect(screen.getByLabelText("MIDI file")).toHaveAttribute("accept", ".mid,.midi,audio/midi");
    expect(screen.getByRole("button", { name: "Choose a MIDI file" })).toBeInTheDocument();
  });

  it("reports a file that could not be read", () => {
    renderImport({ error: "That is not a MIDI file." });

    expect(screen.getByRole("alert")).toHaveTextContent("That is not a MIDI file.");
  });

  it("shows the options and a preview once a file is loaded", () => {
    renderImport({ file: FILE, fileName: "minuet.mid", preview: midiToSong(FILE, { title: "minuet" }) });

    expect(screen.getByRole("group", { name: "Hands" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Line up notes with" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Opening of minuet/ })).toBeInTheDocument();
  });

  it("lets the learner pick a track when the file has more than one", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE) });

    fireEvent.change(screen.getByLabelText("Track"), { target: { value: "1" } });

    expect(importer.setTrackIndex).toHaveBeenCalledWith(1);
  });

  it("lets the learner pick a MIDI channel", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE) });

    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "1" } });

    expect(importer.setChannel).toHaveBeenCalledWith(1);
  });

  it("lets the learner choose a hand and a grid", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE) });

    fireEvent.click(within(screen.getByRole("group", { name: "Hands" })).getByRole("button", { name: "Left hand" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Line up notes with" })).getByRole("button", { name: "Quarter notes" }),
    );

    expect(importer.setHand).toHaveBeenCalledWith("left");
    expect(importer.setGrid).toHaveBeenCalledWith("quarter");
  });

  it("lets the learner transpose", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE) });

    fireEvent.change(screen.getByLabelText("Transpose (semitones)"), { target: { value: "-12" } });

    expect(importer.setTranspose).toHaveBeenCalledWith(-12);
  });

  it("states what the import will cost before it is saved", () => {
    renderImport({
      file: FILE,
      preview: midiToSong(FILE),
      summary: "3 notes were moved onto the beat.",
    });

    // The warnings are the reason this screen exists, not fine print.
    expect(screen.getByText("3 notes were moved onto the beat.")).toBeInTheDocument();
  });

  it("says when a file mapped across cleanly", () => {
    renderImport({ file: FILE, preview: midiToSong(FILE, { grid: "none" }) });

    expect(screen.getByText(/mapped across cleanly/i)).toBeInTheDocument();
  });

  it("saves on request", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE) });

    fireEvent.click(screen.getByRole("button", { name: "Save to my songs" }));

    expect(importer.save).toHaveBeenCalled();
  });

  it("will not offer to save a selection with nothing in it", () => {
    renderImport({ file: FILE, preview: midiToSong(FILE, { channel: 9 }) });

    expect(screen.getByRole("button", { name: "Save to my songs" })).toBeDisabled();
  });

  it("reports what happened after a save", () => {
    renderImport({ file: FILE, preview: midiToSong(FILE), savedMessage: 'Saved to your songs as "minuet".' });

    expect(screen.getByRole("status")).toHaveTextContent(/Saved to your songs/);
  });

  it("lists saved pieces and says where they turn up", () => {
    renderImport({ saved: [SAVED] });

    expect(screen.getByText(/Minuet — 4 events/)).toBeInTheDocument();
    expect(screen.getByText(/appear in Songs/i)).toBeInTheDocument();
  });

  it("removes a saved piece", () => {
    const importer = renderImport({ saved: [SAVED] });

    fireEvent.click(screen.getByRole("button", { name: "Remove Minuet" }));

    expect(importer.remove).toHaveBeenCalledWith("imported-1");
  });

  it("offers to clear a loaded file", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE) });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(importer.clearFile).toHaveBeenCalled();
  });
});

describe("ImportWorkspace file selection", () => {
  it("hands a chosen file to the importer and resets the input", () => {
    const importer = renderImport();
    const input = screen.getByLabelText("MIDI file") as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3]) as BlobPart], "piece.mid", { type: "audio/midi" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(importer.openFile).toHaveBeenCalledWith(file);
    // Cleared so choosing the same file twice still fires a change.
    expect(input.value).toBe("");
  });

  it("does nothing when the picker is dismissed without a file", () => {
    const importer = renderImport();

    fireEvent.change(screen.getByLabelText("MIDI file"), { target: { files: [] } });

    expect(importer.openFile).not.toHaveBeenCalled();
  });

  it("shows the loaded file name", () => {
    renderImport({ file: FILE, fileName: "minuet.mid", preview: midiToSong(FILE) });

    expect(screen.getByText("minuet.mid")).toBeInTheDocument();
  });

  it("hides the file name when the file could not be read", () => {
    renderImport({ fileName: "broken.mid", error: "That file looks damaged or incomplete." });

    expect(screen.queryByText("broken.mid")).not.toBeInTheDocument();
  });

  it("offers no track picker when a file has only one track", () => {
    const single: ParsedMidiFile = { ...FILE, tracks: [FILE.tracks[0] as (typeof FILE.tracks)[number]] };

    renderImport({ file: single, preview: midiToSong(single) });

    expect(screen.queryByLabelText("Track")).not.toBeInTheDocument();
  });

  it("lets the learner go back to all tracks", () => {
    const importer = renderImport({ file: FILE, preview: midiToSong(FILE), trackIndex: 1 });

    fireEvent.change(screen.getByLabelText("Track"), { target: { value: "" } });

    expect(importer.setTrackIndex).toHaveBeenCalledWith(undefined);
  });

  it("labels an unnamed track by its number", () => {
    const unnamed: ParsedMidiFile = {
      ...FILE,
      tracks: FILE.tracks.map((track) => ({ ...track, name: "" })),
    };

    renderImport({ file: unnamed, preview: midiToSong(unnamed) });

    expect(screen.getByRole("option", { name: /Track 1 — 4 notes/ })).toBeInTheDocument();
  });
});
