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
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const releaseAt = startAt + Math.max(0.08, duration - 0.05);

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.22, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, releaseAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
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

export function playMelody(frequencies: number[]): void {
  if (frequencies.length === 0) return;

  const context = getAudioContext();
  const noteDuration = 0.62;
  const noteStep = 0.72;

  frequencies.forEach((frequency, index) => {
    scheduleTone(context, frequency, context.currentTime + index * noteStep, noteDuration);
  });
}
