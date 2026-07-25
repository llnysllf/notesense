// Bridges the legacy single-line Song contract and the richer Score model, so
// the ~200 built-in songs keep working unchanged while new features target the
// canonical model. songToScore is total for any valid Song; scoreToSong is
// best-effort and returns undefined for scores that use anything the legacy
// model cannot express (sixteenths, dotted/tuplet values, multi-voice, meters
// whose beat unit is not a legacy note value).

import {
  DEFAULT_TIME_SIGNATURE,
  type NoteDuration,
  type Song,
  type SongClef,
  type SongEvent,
  type SongSource,
  type TimeSignature,
} from "../songData";
import { DURATION, equalsRational, rational, type Rational } from "./time";
import { noteIdToSpelled, spelledToNoteId, type SpelledPitch } from "./pitch";
import { SCORE_MODEL_VERSION, type Measure, type Meter, type Score, type ScoreEvent } from "./score";

// Legacy durations measured in sixteenth notes (the finest legacy unit), used
// only to detect measure starts the same way SheetStaff draws barlines.
const DURATION_SIXTEENTHS: Record<NoteDuration, number> = { whole: 16, half: 8, quarter: 4, eighth: 2 };
// Legacy beat units expressed as their time-signature denominator.
const BEAT_UNIT_NUMBER: Record<NoteDuration, Meter["beatUnit"]> = { whole: 1, half: 2, quarter: 4, eighth: 8 };
const NUMBER_BEAT_UNIT: Partial<Record<Meter["beatUnit"], NoteDuration>> = {
  1: "whole",
  2: "half",
  4: "quarter",
  8: "eighth",
};

function meterFromTimeSignature(timeSignature: TimeSignature): Meter {
  return { beats: timeSignature.beatsPerMeasure, beatUnit: BEAT_UNIT_NUMBER[timeSignature.beatUnit] };
}

function scoreEventFromSongEvent(event: SongEvent, id: string, offset: Rational): ScoreEvent | undefined {
  const duration = DURATION[event.duration];
  if (event.isRest) return { kind: "rest", id, offset, duration };
  const pitches = event.noteIds.map(noteIdToSpelled).filter((pitch): pitch is SpelledPitch => pitch !== undefined);
  if (pitches.length === 0) return undefined;
  return { kind: "note", id, offset, duration, pitches };
}

// Converts a validated Song into a single-part, single-voice Score. Measures
// are grouped exactly where the legacy barline math (getEventMeasureStarts)
// places them, so nothing about how the song reads changes.
export function songToScore(song: Song): Score {
  const meter = meterFromTimeSignature(song.timeSignature);
  const measureLength16 = song.timeSignature.beatsPerMeasure * DURATION_SIXTEENTHS[song.timeSignature.beatUnit];

  const measures: Measure[] = [];
  let current: ScoreEvent[] = [];
  let position16 = 0;
  let measureStart16 = 0;
  let measureNumber = 1;

  const closeMeasure = () => {
    measures.push({
      id: `${song.id}-m${measureNumber}`,
      number: measureNumber,
      ...(measureNumber === 1 ? { meter } : {}),
      voices: [{ id: `${song.id}-v1`, events: current }],
    });
    measureNumber += 1;
    current = [];
  };

  song.events.forEach((event, index) => {
    if (position16 % measureLength16 === 0 && current.length > 0) {
      closeMeasure();
      measureStart16 = position16;
    }
    const offset = rational(position16 - measureStart16, 4) as Rational;
    const scoreEvent = scoreEventFromSongEvent(event, `${song.id}-e${index}`, offset);
    if (scoreEvent) current.push(scoreEvent);
    position16 += DURATION_SIXTEENTHS[event.duration];
  });
  if (current.length > 0) closeMeasure();

  return {
    id: song.id,
    version: SCORE_MODEL_VERSION,
    title: song.title,
    parts: [
      {
        id: `${song.id}-p1`,
        name: song.title,
        clefs: [{ measure: 1, sign: song.clef === "bass" ? "F" : "G", line: song.clef === "bass" ? 4 : 2 }],
        measures,
      },
    ],
  };
}

function durationToNoteDuration(duration: Rational): NoteDuration | undefined {
  for (const name of ["whole", "half", "quarter", "eighth"] as NoteDuration[]) {
    if (equalsRational(duration, DURATION[name])) return name;
  }
  return undefined;
}

function songEventFromScoreEvent(event: ScoreEvent): SongEvent | undefined {
  const duration = durationToNoteDuration(event.duration);
  if (!duration) return undefined;
  if (event.kind === "rest") return { noteIds: [], duration, isRest: true };
  const noteIds = event.pitches.map(spelledToNoteId);
  if (noteIds.some((noteId) => noteId === undefined)) return undefined;
  return { noteIds: noteIds as string[], duration };
}

// Flattens a Score back to a legacy Song, or undefined when the score uses
// anything outside the legacy model. `source` is supplied by the caller because
// it is metadata the musical model deliberately does not carry.
export function scoreToSong(score: Score, source: SongSource = "builtin"): Song | undefined {
  const part = score.parts[0];
  if (!part) return undefined;

  const meterMeasure = part.measures.find((measure) => measure.meter);
  let timeSignature: TimeSignature = DEFAULT_TIME_SIGNATURE;
  if (meterMeasure?.meter) {
    const beatUnit = NUMBER_BEAT_UNIT[meterMeasure.meter.beatUnit];
    if (!beatUnit) return undefined;
    timeSignature = { beatsPerMeasure: meterMeasure.meter.beats, beatUnit };
  }

  const events: SongEvent[] = [];
  for (const measure of part.measures) {
    const voice = measure.voices[0];
    if (!voice) continue;
    for (const scoreEvent of voice.events) {
      const songEvent = songEventFromScoreEvent(scoreEvent);
      if (!songEvent) return undefined;
      events.push(songEvent);
    }
  }
  if (events.length === 0) return undefined;

  return {
    id: score.id,
    title: score.title,
    source,
    clef: part.clefs[0]?.sign === "F" ? "bass" : ("treble" as SongClef),
    timeSignature,
    events,
  };
}
