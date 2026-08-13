// Turning a parsed MIDI file into something practisable.
//
// This is the lossy step, and it says so. A MIDI file records a performance;
// the song model records something a learner can read and play back. Anything
// that cannot survive the trip — a fifth voice in a chord, a duration with no
// name, a piece longer than the cap — is reported as a warning rather than
// quietly dropped. An import that silently loses half a piece is worse than one
// that refuses, because the learner practises the wrong thing believing it is
// right.

import { midiToNoteId } from "../music/pitch";
import {
  MAX_CHORD_SIZE,
  MAX_SONG_EVENTS,
  MAX_SONG_TITLE_LENGTH,
  type NoteDuration,
  type Song,
  type SongClef,
  type SongEvent,
} from "../songData";
import { initialMeter, type MidiNote, type ParsedMidiFile } from "./midiFile";

// Which notes go to which hand, when a file has both in one track.
export type HandSelection = "both" | "right" | "left";

// The grid onsets are snapped to. A performance is never exactly on the beat,
// and unquantized notation is unreadable.
export type QuantizeGrid = "quarter" | "eighth" | "sixteenth" | "none";

export type MidiImportOptions = {
  trackIndex?: number;
  channel?: number;
  grid?: QuantizeGrid;
  hand?: HandSelection;
  // Whole semitones, for moving a piece into a comfortable range.
  transpose?: number;
  title?: string;
  clef?: SongClef;
};

export type MidiImportPreview = {
  song: Song;
  // How many onsets the quantizer moved, and by how much at worst. Shown
  // before committing, so a learner can tell a tidy file from a mangled one.
  movedCount: number;
  worstMoveTicks: number;
  droppedNotes: number;
  warnings: string[];
};

// The song model names these four durations and no others.
const DURATION_QUARTERS: Record<NoteDuration, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5 };
const DURATIONS = Object.keys(DURATION_QUARTERS) as NoteDuration[];

const GRID_QUARTERS: Record<Exclude<QuantizeGrid, "none">, number> = {
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

// Where the hands are split when a file puts both in one track. Middle C is the
// conventional divide and is wrong for plenty of music, which is why the
// learner can override it rather than being stuck with it.
export const HAND_SPLIT_MIDI = 60;

function nearestDuration(quarters: number): NoteDuration {
  return DURATIONS.reduce((best, candidate) =>
    Math.abs(DURATION_QUARTERS[candidate] - quarters) < Math.abs(DURATION_QUARTERS[best] - quarters) ? candidate : best,
  );
}

function selectNotes(file: ParsedMidiFile, options: MidiImportOptions): MidiNote[] {
  const { trackIndex, channel, hand = "both" } = options;
  return file.notes.filter((note) => {
    if (trackIndex !== undefined && note.trackIndex !== trackIndex) return false;
    if (channel !== undefined && note.channel !== channel) return false;
    if (hand === "right" && note.midi < HAND_SPLIT_MIDI) return false;
    if (hand === "left" && note.midi >= HAND_SPLIT_MIDI) return false;
    return true;
  });
}

// Groups notes that start together into chords, after snapping to the grid.
function groupByOnset(
  notes: readonly MidiNote[],
  ticksPerQuarter: number,
  grid: QuantizeGrid,
): { onsets: Map<number, MidiNote[]>; movedCount: number; worstMoveTicks: number } {
  const step = grid === "none" ? 0 : GRID_QUARTERS[grid] * ticksPerQuarter;
  const onsets = new Map<number, MidiNote[]>();
  let movedCount = 0;
  let worstMoveTicks = 0;

  for (const note of notes) {
    const snapped = step > 0 ? Math.round(note.startTicks / step) * step : note.startTicks;
    const moved = Math.abs(snapped - note.startTicks);
    if (moved > 0) {
      movedCount += 1;
      worstMoveTicks = Math.max(worstMoveTicks, moved);
    }
    const existing = onsets.get(snapped);
    if (existing) existing.push(note);
    else onsets.set(snapped, [note]);
  }

  return { onsets, movedCount, worstMoveTicks };
}

// Builds a practisable song. Deterministic in its input, so the preview a
// learner approves is exactly what gets saved.
export function midiToSong(file: ParsedMidiFile, options: MidiImportOptions = {}): MidiImportPreview {
  const { grid = "sixteenth", transpose = 0, title = "Imported piece", clef = "treble" } = options;
  const warnings = [...file.warnings];

  const selected = selectNotes(file, options);
  if (selected.length === 0) {
    return {
      song: {
        id: "",
        title,
        source: "imported",
        clef,
        timeSignature: { beatsPerMeasure: 4, beatUnit: "quarter" },
        events: [],
      },
      movedCount: 0,
      worstMoveTicks: 0,
      droppedNotes: 0,
      warnings: [...warnings, "Nothing was selected from that file."],
    };
  }

  const { onsets, movedCount, worstMoveTicks } = groupByOnset(selected, file.ticksPerQuarter, grid);
  const positions = [...onsets.keys()].sort((a, b) => a - b);

  const events: SongEvent[] = [];
  let droppedNotes = 0;
  let truncated = false;

  for (const [index, position] of positions.entries()) {
    if (events.length >= MAX_SONG_EVENTS) {
      truncated = true;
      break;
    }

    const chord = (onsets.get(position) ?? []).slice().sort((a, b) => a.midi - b.midi);
    if (chord.length > MAX_CHORD_SIZE) droppedNotes += chord.length - MAX_CHORD_SIZE;

    const noteIds = chord
      .slice(0, MAX_CHORD_SIZE)
      .map((note) => midiToNoteId(note.midi + transpose))
      .filter((noteId) => noteId.length > 0);

    if (noteIds.length === 0) {
      droppedNotes += chord.length;
      continue;
    }

    // A note lasts until the next thing starts, which is what makes the result
    // readable. Using the recorded release instead would produce a page of
    // dotted, tied values nobody could sight-read.
    const next = positions[index + 1];
    const spanTicks = next === undefined ? (chord[0] as MidiNote).durationTicks : Math.max(1, next - position);
    events.push({ noteIds, duration: nearestDuration(spanTicks / file.ticksPerQuarter) });
  }

  if (truncated) warnings.push(`Only the first ${MAX_SONG_EVENTS} events were imported.`);
  if (droppedNotes > 0) {
    warnings.push(`${droppedNotes} note${droppedNotes === 1 ? "" : "s"} did not fit and were left out.`);
  }
  if (grid !== "none" && movedCount > 0) {
    warnings.push(`${movedCount} note${movedCount === 1 ? " was" : "s were"} moved onto the beat.`);
  }

  const meter = initialMeter(file);
  const beatUnit = nearestDuration(4 / meter.beatUnit);

  return {
    song: {
      id: "",
      title: title.trim().slice(0, MAX_SONG_TITLE_LENGTH) || "Imported piece",
      source: "imported",
      clef,
      timeSignature: { beatsPerMeasure: Math.max(1, Math.min(12, meter.beats)), beatUnit },
      events,
    },
    movedCount,
    worstMoveTicks,
    droppedNotes,
    warnings,
  };
}

// A plain-language read of what an import will cost, or nothing when it is
// clean. Shown next to the preview so the decision is informed.
export function describeImport(preview: MidiImportPreview): string | undefined {
  if (preview.song.events.length === 0) return "There is nothing to practise in that selection.";
  if (preview.warnings.length === 0) return undefined;
  return preview.warnings.join(" ");
}
