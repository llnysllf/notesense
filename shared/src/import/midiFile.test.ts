import { describe, expect, it } from "vitest";
import { initialBpm, initialMeter, parseMidiFile } from "./midiFile";
import { MAX_MIDI_FILE_BYTES } from "../songData";

// Building MIDI by hand, because the point of these tests is what happens with
// bytes nobody sanitised.
function bytes(...values: (number | number[])[]): number[] {
  return values.flat();
}

function variable(value: number): number[] {
  const out = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    out.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return out;
}

function chunk(tag: string, body: number[]): number[] {
  const id = [...tag].map((character) => character.charCodeAt(0));
  const length = body.length;
  return [...id, (length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff, ...body];
}

function header(format: number, tracks: number, division: number): number[] {
  return chunk("MThd", [
    (format >> 8) & 0xff,
    format & 0xff,
    (tracks >> 8) & 0xff,
    tracks & 0xff,
    (division >> 8) & 0xff,
    division & 0xff,
  ]);
}

function note(delta: number, midi: number, on: boolean, channel = 0, velocity = 80): number[] {
  return bytes(variable(delta), [(on ? 0x90 : 0x80) | channel, midi, on ? velocity : 0]);
}

const END_OF_TRACK = bytes(variable(0), [0xff, 0x2f, 0x00]);

function file(trackBodies: number[][], division = 480, format = 1): Uint8Array {
  return new Uint8Array([
    ...header(format, trackBodies.length, division),
    ...trackBodies.flatMap((body) => chunk("MTrk", body)),
  ]);
}

const SIMPLE = file([
  bytes(note(0, 60, true), note(480, 60, false), note(0, 64, true), note(480, 64, false), END_OF_TRACK),
]);

describe("reading a MIDI file", () => {
  it("reads notes with their start and length", () => {
    const result = parseMidiFile(SIMPLE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.notes).toHaveLength(2);
    expect(result.file.notes[0]).toMatchObject({ midi: 60, startTicks: 0, durationTicks: 480 });
    expect(result.file.notes[1]).toMatchObject({ midi: 64, startTicks: 480, durationTicks: 480 });
    expect(result.file.ticksPerQuarter).toBe(480);
  });

  it("treats a note-on with velocity zero as a release", () => {
    const zeroRelease = file([bytes(variable(0), [0x90, 60, 90], variable(240), [0x90, 60, 0], END_OF_TRACK)]);

    const result = parseMidiFile(zeroRelease);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The same trap as live MIDI: read as a second note-on, this would be a
    // note that never ends.
    expect(result.file.notes).toHaveLength(1);
    expect(result.file.notes[0]?.durationTicks).toBe(240);
  });

  it("follows running status", () => {
    const running = file([
      bytes(
        variable(0),
        [0x90, 60, 80],
        variable(480),
        [60, 0],
        variable(0),
        [62, 80],
        variable(480),
        [62, 0],
        END_OF_TRACK,
      ),
    ]);

    const result = parseMidiFile(running);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.notes.map((entry) => entry.midi)).toEqual([60, 62]);
  });

  it("reads the tempo and time signature it opens at", () => {
    const withMeta = file([
      bytes(
        variable(0),
        [0xff, 0x51, 0x03, 0x07, 0xa1, 0x20], // 500000us = 120bpm
        variable(0),
        [0xff, 0x58, 0x04, 3, 2, 24, 8], // 3/4
        note(0, 60, true),
        note(480, 60, false),
        END_OF_TRACK,
      ),
    ]);

    const result = parseMidiFile(withMeta);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(initialBpm(result.file)).toBe(120);
    expect(initialMeter(result.file)).toEqual({ beats: 3, beatUnit: 4 });
  });

  it("assumes the MIDI defaults when a file says nothing", () => {
    const result = parseMidiFile(SIMPLE);

    if (!result.ok) throw new Error("expected a parse");
    expect(initialBpm(result.file)).toBe(120);
    expect(initialMeter(result.file)).toEqual({ beats: 4, beatUnit: 4 });
  });

  it("reads a track name without letting arbitrary bytes through", () => {
    const named = file([
      bytes(
        variable(0),
        [0xff, 0x03, 0x08],
        [..."Piano".split("").map((c) => c.charCodeAt(0)), 0x00, 0x01],
        note(0, 60, true),
        note(480, 60, false),
        END_OF_TRACK,
      ),
    ]);

    const result = parseMidiFile(named);

    if (!result.ok) throw new Error("expected a parse");
    // Control bytes are dropped rather than carried into the UI.
    expect(result.file.tracks[0]?.name).toBe("Piano");
  });

  it("summarises each track so a learner can choose one", () => {
    const twoTracks = file([
      bytes(note(0, 60, true), note(480, 60, false), END_OF_TRACK),
      bytes(note(0, 48, true, 1), note(480, 48, false, 1), END_OF_TRACK),
    ]);

    const result = parseMidiFile(twoTracks);

    if (!result.ok) throw new Error("expected a parse");
    expect(result.file.tracks).toHaveLength(2);
    expect(result.file.tracks[1]).toMatchObject({ index: 1, noteCount: 1, lowMidi: 48, highMidi: 48, channels: [1] });
  });

  it("skips events it does not use without losing its place", () => {
    const withControllers = file([
      bytes(
        variable(0),
        [0xb0, 7, 100], // controller
        variable(0),
        [0xc0, 42], // program change: one data byte, not two
        variable(0),
        [0xe0, 0, 64], // pitch bend
        note(0, 60, true),
        note(480, 60, false),
        END_OF_TRACK,
      ),
    ]);

    const result = parseMidiFile(withControllers);

    if (!result.ok) throw new Error("expected a parse");
    // Getting a length wrong here would read the next event's bytes as a note.
    expect(result.file.notes).toHaveLength(1);
    expect(result.file.notes[0]?.midi).toBe(60);
  });

  it("skips SysEx by its declared length", () => {
    const withSysex = file([
      bytes(variable(0), [0xf0], variable(4), [1, 2, 3, 0xf7], note(0, 60, true), note(480, 60, false), END_OF_TRACK),
    ]);

    const result = parseMidiFile(withSysex);

    if (!result.ok) throw new Error("expected a parse");
    expect(result.file.notes).toHaveLength(1);
  });

  it("says when a piece changes tempo rather than pretending it does not", () => {
    const changing = file([
      bytes(
        variable(0),
        [0xff, 0x51, 0x03, 0x07, 0xa1, 0x20],
        note(0, 60, true),
        note(480, 60, false),
        variable(0),
        [0xff, 0x51, 0x03, 0x0f, 0x42, 0x40],
        END_OF_TRACK,
      ),
    ]);

    const result = parseMidiFile(changing);

    if (!result.ok) throw new Error("expected a parse");
    expect(result.file.warnings.join(" ")).toMatch(/changes tempo/i);
  });

  it("warns about a note that is never released", () => {
    const stuck = file([bytes(note(0, 60, true), END_OF_TRACK)]);

    const result = parseMidiFile(stuck);

    // No completed notes at all, so this file has nothing to practise.
    expect(result.ok).toBe(false);
  });
});

describe("refusing files it should refuse", () => {
  it("rejects an empty file", () => {
    expect(parseMidiFile(new Uint8Array())).toMatchObject({ ok: false, error: expect.stringMatching(/empty/i) });
  });

  it("rejects something that is not MIDI at all", () => {
    const notMidi = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);

    expect(parseMidiFile(notMidi)).toMatchObject({ ok: false, error: expect.stringMatching(/not a MIDI file/i) });
  });

  it("rejects a file larger than the cap without parsing it", () => {
    const huge = new Uint8Array(MAX_MIDI_FILE_BYTES + 1);

    expect(parseMidiFile(huge)).toMatchObject({ ok: false, error: expect.stringMatching(/too large/i) });
  });

  it("rejects a truncated file rather than reading past the end", () => {
    const truncated = SIMPLE.slice(0, SIMPLE.length - 6);

    expect(parseMidiFile(truncated)).toMatchObject({ ok: false, error: expect.stringMatching(/damaged|incomplete/i) });
  });

  it("rejects a track whose declared length runs past the end of the file", () => {
    const lying = new Uint8Array([...header(1, 1, 480), ...[0x4d, 0x54, 0x72, 0x6b, 0x7f, 0xff, 0xff, 0xff], 0x00]);

    // A length field is a claim, not a fact.
    expect(parseMidiFile(lying)).toMatchObject({ ok: false });
  });

  it("rejects a malformed variable-length value instead of looping", () => {
    const runaway = file([bytes([0x80, 0x80, 0x80, 0x80, 0x80], [0x90, 60, 80], END_OF_TRACK)]);

    expect(parseMidiFile(runaway)).toMatchObject({ ok: false });
  });

  it("refuses timecode division rather than approximating musical time", () => {
    const smpte = file([bytes(note(0, 60, true), note(480, 60, false), END_OF_TRACK)], 0xe728);

    expect(parseMidiFile(smpte)).toMatchObject({ ok: false, error: expect.stringMatching(/timecode/i) });
  });

  it("refuses nonsense timing", () => {
    expect(parseMidiFile(file([bytes(END_OF_TRACK)], 0))).toMatchObject({ ok: false });
  });

  it("says so when a file has no notes", () => {
    const silent = file([bytes(variable(0), [0xff, 0x03, 0x04], [80, 80, 80, 80], END_OF_TRACK)]);

    expect(parseMidiFile(silent)).toMatchObject({ ok: false, error: expect.stringMatching(/no notes/i) });
  });

  it("stops reading a file with an absurd number of notes", () => {
    const many: number[] = [];
    for (let index = 0; index < 25_000; index += 1) {
      many.push(...note(0, 60, true), ...note(1, 60, false));
    }
    const flood = file([bytes(many, END_OF_TRACK)]);

    expect(parseMidiFile(flood)).toMatchObject({ ok: false, error: expect.stringMatching(/too many notes/i) });
  });

  it("caps how many tracks it will read", () => {
    const tracks = Array.from({ length: 70 }, () => bytes(note(0, 60, true), note(480, 60, false), END_OF_TRACK));
    const result = parseMidiFile(file(tracks));

    if (!result.ok) throw new Error("expected a parse");
    expect(result.file.tracks.length).toBeLessThanOrEqual(64);
    expect(result.file.warnings.join(" ")).toMatch(/first 64 tracks/i);
  });
});
