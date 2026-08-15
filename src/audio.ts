import { renderNote } from "./sound/soundWorlds";
import type { SoundWorld } from "./types";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

// Safari commonly creates a context in the suspended state until a user
// interaction explicitly resumes it. Creating oscillators alone still makes
// the browser show audio activity, but nothing reaches the speakers. Every
// public playback entry point calls this synchronously so a click on “play”
// remains the gesture Safari needs; delayed auto-play can then use the context
// that the learner has already unlocked.
function resumeAudio(context: AudioContext): void {
  const resumed = context.resume?.();
  void resumed?.catch(() => undefined);
}

export function playTone(frequency: number): void {
  const context = getAudioContext();
  resumeAudio(context);
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
  resumeAudio(context);

  groups.forEach((frequencies, index) => {
    const startAt = context.currentTime + index * gapSeconds;
    for (const frequency of frequencies) scheduleTone(context, frequency, startAt, gapSeconds * 0.85);
  });
}

export function playMelody(frequencies: number[], noteDuration = 0.62, noteStep = 0.72): void {
  if (frequencies.length === 0) return;

  const context = getAudioContext();
  resumeAudio(context);

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
  resumeAudio(context);

  [261.63, 329.63, 392].forEach((frequency, index) => {
    renderNote(context, frequency, context.currentTime + index * 0.26, 0.5, world);
  });
}
