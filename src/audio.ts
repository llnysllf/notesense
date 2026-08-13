import { renderNote } from "./sound/soundWorlds";
import type { SoundWorld } from "./types";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playTone(frequency: number): void {
  const context = getAudioContext();
  scheduleTone(context, frequency, context.currentTime, 0.9);
}

function scheduleTone(context: AudioContext, frequency: number, startAt: number, duration: number): void {
  // Every sound in the app goes through the active sound world, so changing it
  // changes ear training, melodies, and reading playback together rather than
  // leaving one screen on the old voice.
  renderNote(context, frequency, startAt, duration);
}

// Playing an ear-training stimulus: one note, a chord, notes in turn, or a
// sequence of chords. Grouped playback is what lets a cadence sound like two
// chords instead of one six-note pile.
export function playPitchGroups(groups: number[][], gapSeconds = 0.9): void {
  if (groups.length === 0) return;

  const context = getAudioContext();
  void context.resume?.();

  groups.forEach((frequencies, index) => {
    const startAt = context.currentTime + index * gapSeconds;
    for (const frequency of frequencies) scheduleTone(context, frequency, startAt, gapSeconds * 0.85);
  });
}

export function playMelody(frequencies: number[], noteDuration = 0.62, noteStep = 0.72): void {
  if (frequencies.length === 0) return;

  const context = getAudioContext();

  frequencies.forEach((frequency, index) => {
    scheduleTone(context, frequency, context.currentTime + index * noteStep, noteDuration);
  });
}

// A short arpeggio in one particular world, for the picker.
//
// Three notes rather than one: a single tone tells you almost nothing about a
// voice, while an onset, a middle, and a release let you actually hear the
// difference you are choosing between. The world is passed in, so previewing
// does not change what practice sounds like until the choice is made.
export function playSoundWorldPreview(world: SoundWorld): void {
  const context = getAudioContext();
  void context.resume?.();

  [261.63, 329.63, 392].forEach((frequency, index) => {
    renderNote(context, frequency, context.currentTime + index * 0.26, 0.5, world);
  });
}
