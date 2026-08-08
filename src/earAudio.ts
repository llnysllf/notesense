// Turning an ear-training stimulus into sound.
//
// The stimulus says what to play and how — one note, a chord, notes in turn, or
// a sequence of chords — and this is the only place that mapping lives. Keeping
// it here means a generator can add a family without a screen learning how to
// play it.

import { playPitchGroups } from "./audio";
import { getNoteFrequency } from "./noteData";
import { midiToNoteId, type ExerciseStimulus } from "./types";

// Notes in turn need a gap you can hear the distance across; a chord only needs
// long enough to register.
const ARPEGGIO_GAP_SECONDS = 0.62;
const CHORD_GAP_SECONDS = 1.15;

function frequencies(midi: readonly number[]): number[] {
  return midi
    .map((value) => getNoteFrequency(midiToNoteId(value)))
    .filter((frequency): frequency is number => frequency !== undefined);
}

// Splits a flat pitch list into the chords the stimulus asked for.
export function stimulusGroups(stimulus: ExerciseStimulus): number[][] {
  if (stimulus.kind !== "audio-pitch") return [];
  if (stimulus.playback === "arpeggio") return stimulus.midi.map((midi) => [midi]);
  const size = stimulus.groupSize ?? stimulus.midi.length;
  const groups: number[][] = [];
  for (let index = 0; index < stimulus.midi.length; index += size) {
    groups.push(stimulus.midi.slice(index, index + size));
  }
  return groups;
}

export function playStimulus(stimulus: ExerciseStimulus): void {
  if (stimulus.kind !== "audio-pitch") return;
  const groups = stimulusGroups(stimulus).map(frequencies);
  playPitchGroups(groups, stimulus.playback === "arpeggio" ? ARPEGGIO_GAP_SECONDS : CHORD_GAP_SECONDS);
}

// Plays back what the learner entered, so they can hear their own answer
// against the source rather than only reading a verdict about it.
export function playPitches(midi: readonly number[]): void {
  playPitchGroups(
    midi.map((value) => frequencies([value])),
    ARPEGGIO_GAP_SECONDS,
  );
}
