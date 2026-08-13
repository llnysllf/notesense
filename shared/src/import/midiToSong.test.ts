import { describe, expect, it } from "vitest";
import { MAX_CHORD_SIZE, MAX_SONG_EVENTS } from "../songData";
import type { MidiNote, ParsedMidiFile } from "./midiFile";
import { describeImport, midiToSong, HAND_SPLIT_MIDI } from "./midiToSong";

const TICKS = 480;

function note(overrides: Partial<MidiNote> & Pick<MidiNote, "startTicks" | "midi">): MidiNote {
  return {
    durationTicks: TICKS,
    velocity: 80,
    channel: 0,
    trackIndex: 0,
    ...overrides,
  };
}

function parsed(notes: MidiNote[], overrides: Partial<ParsedMidiFile> = {}): ParsedMidiFile {
  return {
    format: 1,
    ticksPerQuarter: TICKS,
    notes,
    tempoChanges: [],
    meterChanges: [],
    tracks: [],
    warnings: [],
    ...overrides,
  };
}

const SCALE = parsed([
  note({ startTicks: 0, midi: 60 }),
  note({ startTicks: TICKS, midi: 62 }),
  note({ startTicks: TICKS * 2, midi: 64 }),
]);

describe("mapping MIDI into a practisable song", () => {
  it("keeps the notes, in order", () => {
    const preview = midiToSong(SCALE);

    expect(preview.song.events.map((event) => event.noteIds[0])).toEqual(["C4", "D4", "E4"]);
    expect(preview.song.source).toBe("imported");
  });

  it("gives each note the length until the next one starts", () => {
    const uneven = parsed([
      note({ startTicks: 0, midi: 60 }),
      note({ startTicks: TICKS * 2, midi: 62 }),
      note({ startTicks: TICKS * 3, midi: 64 }),
    ]);

    const preview = midiToSong(uneven);

    // Reading length from the recorded release instead would produce a page of
    // tied values nobody could sight-read.
    expect(preview.song.events.map((event) => event.duration)).toEqual(["half", "quarter", "quarter"]);
  });

  it("groups notes that start together into a chord", () => {
    const chord = parsed([
      note({ startTicks: 0, midi: 60 }),
      note({ startTicks: 0, midi: 64 }),
      note({ startTicks: 0, midi: 67 }),
    ]);

    const preview = midiToSong(chord);

    expect(preview.song.events).toHaveLength(1);
    expect(preview.song.events[0]?.noteIds).toEqual(["C4", "E4", "G4"]);
  });

  it("snaps a human performance onto the beat and says how much it moved", () => {
    const played = parsed([note({ startTicks: 7, midi: 60 }), note({ startTicks: TICKS - 9, midi: 62 })]);

    const preview = midiToSong(played, { grid: "sixteenth" });

    expect(preview.movedCount).toBe(2);
    expect(preview.worstMoveTicks).toBeGreaterThan(0);
    expect(preview.warnings.join(" ")).toMatch(/moved onto the beat/i);
  });

  it("leaves onsets alone when asked not to quantize", () => {
    const played = parsed([note({ startTicks: 7, midi: 60 }), note({ startTicks: TICKS + 3, midi: 62 })]);

    const preview = midiToSong(played, { grid: "none" });

    expect(preview.movedCount).toBe(0);
    expect(preview.warnings.join(" ")).not.toMatch(/moved onto the beat/i);
  });

  it("selects a single track", () => {
    const twoTracks = parsed([
      note({ startTicks: 0, midi: 60, trackIndex: 0 }),
      note({ startTicks: 0, midi: 48, trackIndex: 1 }),
    ]);

    expect(midiToSong(twoTracks, { trackIndex: 1 }).song.events[0]?.noteIds).toEqual(["C3"]);
  });

  it("selects a single channel", () => {
    const twoChannels = parsed([
      note({ startTicks: 0, midi: 60, channel: 0 }),
      note({ startTicks: 0, midi: 48, channel: 3 }),
    ]);

    expect(midiToSong(twoChannels, { channel: 3 }).song.events[0]?.noteIds).toEqual(["C3"]);
  });

  it("splits the hands at middle C", () => {
    const bothHands = parsed([
      note({ startTicks: 0, midi: HAND_SPLIT_MIDI - 12 }),
      note({ startTicks: 0, midi: HAND_SPLIT_MIDI + 4 }),
    ]);

    expect(midiToSong(bothHands, { hand: "right" }).song.events[0]?.noteIds).toEqual(["E4"]);
    expect(midiToSong(bothHands, { hand: "left" }).song.events[0]?.noteIds).toEqual(["C3"]);
    expect(midiToSong(bothHands, { hand: "both" }).song.events[0]?.noteIds).toHaveLength(2);
  });

  it("transposes by whole semitones, keeping the shape", () => {
    const preview = midiToSong(SCALE, { transpose: 12 });

    expect(preview.song.events.map((event) => event.noteIds[0])).toEqual(["C5", "D5", "E5"]);
  });

  it("takes the time signature from the file", () => {
    const inThree = parsed(SCALE.notes, { meterChanges: [{ atTicks: 0, beats: 3, beatUnit: 4 }] });

    expect(midiToSong(inThree).song.timeSignature).toEqual({ beatsPerMeasure: 3, beatUnit: "quarter" });
  });

  it("caps a chord and says how many notes it left out", () => {
    const dense = parsed([48, 52, 55, 59, 62, 65].map((midi) => note({ startTicks: 0, midi })));

    const preview = midiToSong(dense);

    expect(preview.song.events[0]?.noteIds).toHaveLength(MAX_CHORD_SIZE);
    expect(preview.droppedNotes).toBe(2);
    expect(preview.warnings.join(" ")).toMatch(/did not fit/i);
  });

  it("caps a long piece and says it was cut", () => {
    const long = parsed(
      Array.from({ length: MAX_SONG_EVENTS + 40 }, (_, index) => note({ startTicks: index * TICKS, midi: 60 })),
    );

    const preview = midiToSong(long);

    expect(preview.song.events).toHaveLength(MAX_SONG_EVENTS);
    expect(preview.warnings.join(" ")).toMatch(new RegExp(`first ${MAX_SONG_EVENTS} events`, "i"));
  });

  it("carries the parser's own warnings through", () => {
    const noisy = parsed(SCALE.notes, { warnings: ["This piece changes tempo; NoteSense uses the first tempo."] });

    expect(midiToSong(noisy).warnings.join(" ")).toMatch(/changes tempo/i);
  });

  it("drops a note that has no place on the piano rather than inventing one", () => {
    const impossible = parsed([note({ startTicks: 0, midi: 60 }), note({ startTicks: TICKS, midi: 120 })]);

    const preview = midiToSong(impossible);

    expect(preview.song.events).toHaveLength(1);
    expect(preview.droppedNotes).toBe(1);
  });

  it("says so when a selection contains nothing", () => {
    const preview = midiToSong(SCALE, { channel: 9 });

    expect(preview.song.events).toEqual([]);
    expect(describeImport(preview)).toMatch(/nothing to practise/i);
  });

  it("has nothing to report about a clean import", () => {
    expect(describeImport(midiToSong(SCALE, { grid: "none" }))).toBeUndefined();
  });

  it("uses a given title, trimmed, and falls back when it is blank", () => {
    expect(midiToSong(SCALE, { title: "  Minuet  " }).song.title).toBe("Minuet");
    expect(midiToSong(SCALE, { title: "   " }).song.title).toBe("Imported piece");
  });

  it("is deterministic, so the preview is what gets saved", () => {
    const options = { grid: "eighth", transpose: 2, hand: "right" } as const;

    expect(midiToSong(SCALE, options)).toEqual(midiToSong(SCALE, options));
  });
});
