// Compiles a Score into a flat, ordered timeline of expected onsets in integer
// ticks (musical time) at a versioned transport resolution. This is *expected*
// score time only; a performer's input is captured separately in audio-clock
// seconds and matched against ticksToSeconds() by the scorer (later slices).
// Keeping the two apart is deliberate: musical time is authored and invariant,
// performed time is measured and device-dependent.

import { rationalToTicks, TRANSPORT_V1, type Transport } from "./time";
import { spelledToMidi } from "./pitch";
import { measureLengthInQuarters, type Meter, type Score } from "./score";

export type TimelineEvent = {
  sourceId: string; // the originating ScoreEvent.id
  partId: string;
  voiceId: string;
  measure: number;
  startTicks: number; // expected onset in musical time
  durationTicks: number;
  isRest: boolean;
  midi: number[]; // sounding pitches, empty for rests
};

export type CompiledTimeline = {
  transport: Transport;
  events: TimelineEvent[]; // sorted by startTicks, then by voice for stability
  totalTicks: number;
};

const DEFAULT_METER: Meter = { beats: 4, beatUnit: 4 };

// A pickup has an explicit authored duration, so it begins at tick zero and
// the following full measure starts immediately after it.
export function compileScore(score: Score, transport: Transport = TRANSPORT_V1): CompiledTimeline {
  const events: TimelineEvent[] = [];
  let totalTicks = 0;

  for (const part of score.parts) {
    let currentMeter = DEFAULT_METER;
    let measureStartTicks = 0;

    for (const measure of part.measures) {
      if (measure.meter) currentMeter = measure.meter;
      const measureLengthTicks =
        rationalToTicks(measure.pickupDuration ?? measureLengthInQuarters(currentMeter), transport) ?? 0;

      for (const voice of measure.voices) {
        for (const event of voice.events) {
          const offsetTicks = rationalToTicks(event.offset, transport);
          const durationTicks = rationalToTicks(event.duration, transport);
          if (offsetTicks === undefined || durationTicks === undefined) continue;

          const startTicks = measureStartTicks + offsetTicks;
          const midi = event.kind === "note" ? event.pitches.map(spelledToMidi) : [];
          events.push({
            sourceId: event.id,
            partId: part.id,
            voiceId: voice.id,
            measure: measure.number,
            startTicks,
            durationTicks,
            isRest: event.kind === "rest",
            midi,
          });
          totalTicks = Math.max(totalTicks, startTicks + durationTicks);
        }
      }

      measureStartTicks += measureLengthTicks;
    }
  }

  events.sort((a, b) => a.startTicks - b.startTicks || a.voiceId.localeCompare(b.voiceId));
  return { transport, events, totalTicks };
}

// Maps an expected musical tick position to scheduled audio-clock seconds at a
// tempo. bpm is quarter notes per minute. This is the one place musical time is
// projected onto the audio timeline the scorer schedules against.
export function ticksToSeconds(ticks: number, bpm: number, transport: Transport = TRANSPORT_V1): number {
  return (ticks / transport.ppq) * (60 / bpm);
}

// The compiled timeline's authored length in quarter-note beats. Useful for
// progress bars and layout without re-walking the score.
export function timelineDurationBeats(timeline: CompiledTimeline): number {
  return timeline.totalTicks / timeline.transport.ppq;
}
