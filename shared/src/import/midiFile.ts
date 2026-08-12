// Reading a Standard MIDI File.
//
// Every byte here comes from a file a stranger could have written, so the
// parser's job is as much refusal as it is reading. It is bounded at every
// point where a file gets to say "how many": a length field, an event count, a
// delta time. A parser that trusts those numbers can be made to allocate
// gigabytes by a file of a few hundred bytes.
//
// This is a deliberate subset, not a general MIDI implementation. Note on/off,
// tempo, time signature, and track names are what a practice app needs; SysEx,
// controllers, and pitch bend are skipped by length rather than interpreted.
// Everything skipped is skipped *knowingly* — the parser always knows how long
// an event is, so it can never lose its place and start reading noise as notes.

import { MAX_MIDI_FILE_BYTES } from "../songData";
import { ByteReader } from "./byteReader";

export const MAX_MIDI_TRACKS = 64;
export const MAX_MIDI_EVENTS = 40_000;
// A file claiming more than this per quarter note is either broken or hostile;
// real files use 96–960.
export const MAX_TICKS_PER_QUARTER = 30_000;

export type MidiNote = {
  // Absolute position from the start of the file, in the file's own ticks.
  startTicks: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  channel: number;
  trackIndex: number;
};

export type MidiTempoChange = { atTicks: number; microsecondsPerQuarter: number };
export type MidiMeterChange = { atTicks: number; beats: number; beatUnit: number };

export type MidiTrackSummary = {
  index: number;
  name: string;
  noteCount: number;
  channels: number[];
  lowMidi: number;
  highMidi: number;
};

export type ParsedMidiFile = {
  format: number;
  ticksPerQuarter: number;
  notes: MidiNote[];
  tempoChanges: MidiTempoChange[];
  meterChanges: MidiMeterChange[];
  tracks: MidiTrackSummary[];
  // What the file contained that this parser did not use. Shown to the learner
  // rather than swallowed, so an import that loses something says so.
  warnings: string[];
};

export type MidiParseResult = { ok: true; file: ParsedMidiFile } | { ok: false; error: string };

const HEADER = 0x4d546864; // "MThd"
const TRACK = 0x4d54726b; // "MTrk"

type PendingNote = { startTicks: number; velocity: number };

function noteKey(channel: number, midi: number): number {
  return channel * 128 + midi;
}

// Parses a file. Never throws: a bad file is a result, not an exception, because
// "this file will not open" is something the screen has to say either way.
export function parseMidiFile(bytes: Uint8Array): MidiParseResult {
  if (bytes.length === 0) return { ok: false, error: "That file is empty." };
  if (bytes.length > MAX_MIDI_FILE_BYTES) {
    return { ok: false, error: "That file is too large to import. NoteSense accepts MIDI files up to 512 KB." };
  }

  try {
    return parse(bytes);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof RangeError ? "That file looks damaged or incomplete." : "That file could not be read.",
    };
  }
}

function parse(bytes: Uint8Array): MidiParseResult {
  const reader = new ByteReader(bytes);

  if (reader.uint32() !== HEADER) return { ok: false, error: "That is not a MIDI file." };
  const headerLength = reader.uint32();
  if (headerLength < 6) return { ok: false, error: "That file looks damaged or incomplete." };

  const format = reader.uint16();
  const declaredTracks = reader.uint16();
  const division = reader.uint16();
  // Anything past the six bytes we understand belongs to a later spec revision.
  reader.skip(headerLength - 6);

  if (format !== 0 && format !== 1 && format !== 2) return { ok: false, error: "That MIDI format is not supported." };
  // The high bit means SMPTE timecode rather than ticks per quarter note.
  // Practice material is measured in musical time, so this is refused rather
  // than approximated into something that would look right and drift.
  if ((division & 0x8000) !== 0) {
    return { ok: false, error: "That file uses timecode rather than musical time, which NoteSense cannot import." };
  }
  const ticksPerQuarter = division & 0x7fff;
  if (ticksPerQuarter < 1 || ticksPerQuarter > MAX_TICKS_PER_QUARTER) {
    return { ok: false, error: "That file's timing information is out of range." };
  }

  const warnings: string[] = [];
  const notes: MidiNote[] = [];
  const tempoChanges: MidiTempoChange[] = [];
  const meterChanges: MidiMeterChange[] = [];
  const tracks: MidiTrackSummary[] = [];
  let eventCount = 0;

  const trackLimit = Math.min(declaredTracks, MAX_MIDI_TRACKS);
  if (declaredTracks > MAX_MIDI_TRACKS) {
    warnings.push(`Only the first ${MAX_MIDI_TRACKS} tracks were read.`);
  }

  for (let trackIndex = 0; trackIndex < trackLimit && reader.remaining > 8; trackIndex += 1) {
    if (reader.uint32() !== TRACK) return { ok: false, error: "That file looks damaged or incomplete." };
    const length = reader.uint32();
    const end = reader.position + length;
    if (length > reader.remaining) return { ok: false, error: "That file looks damaged or incomplete." };

    const summary: MidiTrackSummary = {
      index: trackIndex,
      name: "",
      noteCount: 0,
      channels: [],
      lowMidi: 127,
      highMidi: 0,
    };
    const pending = new Map<number, PendingNote>();
    let ticks = 0;
    let runningStatus = 0;

    while (reader.position < end) {
      ticks += reader.variable();
      let status = reader.byte();

      // Running status: a data byte here means "same event type as last time".
      if ((status & 0x80) === 0) {
        reader.seek(reader.position - 1);
        status = runningStatus;
        if (status === 0) return { ok: false, error: "That file looks damaged or incomplete." };
      } else if (status < 0xf0) {
        runningStatus = status;
      }

      if (status === 0xff) {
        const type = reader.byte();
        const metaLength = reader.variable();
        if (type === 0x03 && summary.name === "") {
          summary.name = reader.text(metaLength);
        } else if (type === 0x51 && metaLength === 3) {
          tempoChanges.push({
            atTicks: ticks,
            microsecondsPerQuarter: (reader.byte() << 16) | (reader.byte() << 8) | reader.byte(),
          });
        } else if (type === 0x58 && metaLength >= 2) {
          const beats = reader.byte();
          const beatUnit = 2 ** reader.byte();
          meterChanges.push({ atTicks: ticks, beats, beatUnit });
          reader.skip(metaLength - 2);
        } else {
          reader.skip(metaLength);
        }
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        // SysEx: skipped by its declared length, never interpreted.
        reader.skip(reader.variable());
        continue;
      }

      const command = status & 0xf0;
      const channel = status & 0x0f;

      if (command === 0x90 || command === 0x80) {
        const midi = reader.byte() & 0x7f;
        const velocity = reader.byte() & 0x7f;
        eventCount += 1;
        if (eventCount > MAX_MIDI_EVENTS) {
          return { ok: false, error: "That file has too many notes for NoteSense to import." };
        }

        const key = noteKey(channel, midi);
        // A note-on with velocity 0 is a release: the same trap as live MIDI.
        if (command === 0x90 && velocity > 0) {
          pending.set(key, { startTicks: ticks, velocity });
        } else {
          const started = pending.get(key);
          if (started) {
            pending.delete(key);
            notes.push({
              startTicks: started.startTicks,
              durationTicks: Math.max(1, ticks - started.startTicks),
              midi,
              velocity: started.velocity,
              channel,
              trackIndex,
            });
            summary.noteCount += 1;
            summary.lowMidi = Math.min(summary.lowMidi, midi);
            summary.highMidi = Math.max(summary.highMidi, midi);
            if (!summary.channels.includes(channel)) summary.channels.push(channel);
          }
        }
        continue;
      }

      // Everything else is skipped by its known length, so the cursor stays in
      // step with the file rather than drifting into the middle of an event.
      reader.skip(command === 0xc0 || command === 0xd0 ? 1 : 2);
    }

    if (pending.size > 0) warnings.push(`Track ${trackIndex + 1} has notes that are never released.`);
    reader.seek(end);
    if (summary.noteCount > 0) tracks.push(summary);
  }

  if (notes.length === 0) return { ok: false, error: "That file has no notes in it." };

  notes.sort((a, b) => a.startTicks - b.startTicks || a.midi - b.midi);
  if (tempoChanges.length > 1) warnings.push("This piece changes tempo; NoteSense uses the first tempo.");
  if (meterChanges.length > 1) warnings.push("This piece changes time signature; NoteSense uses the first one.");

  return { ok: true, file: { format, ticksPerQuarter, notes, tempoChanges, meterChanges, tracks, warnings } };
}

// The tempo a file opens at, in beats per minute.
export function initialBpm(file: ParsedMidiFile): number {
  const first = file.tempoChanges[0];
  // 500,000 microseconds per quarter is the MIDI default: 120bpm.
  const microseconds = first?.microsecondsPerQuarter ?? 500_000;
  return Math.round(60_000_000 / Math.max(1, microseconds));
}

export function initialMeter(file: ParsedMidiFile): { beats: number; beatUnit: number } {
  const first = file.meterChanges[0];
  return { beats: first?.beats ?? 4, beatUnit: first?.beatUnit ?? 4 };
}
