// Finding the pitch of a frame of audio.
//
// Normalized autocorrelation (the core of YIN, without its cumulative-mean
// step): the signal is compared against delayed copies of itself, and the delay
// that matches best is the period. It is chosen over an FFT peak because a sung
// vowel has a strong harmonic series, and an FFT will happily report the second
// harmonic as the fundamental — telling a learner they sang an octave high when
// they did not.
//
// This is pure arithmetic over a sample buffer. It knows nothing about Web
// Audio, microphones, or permission, which is what makes it testable against
// synthesized tones rather than only against a person in a room.

export type PitchEstimate = {
  // Hertz, or 0 when nothing pitched was found.
  hertz: number;
  // 0..1. Below the voicing threshold the frame is silence, breath, or noise,
  // and reporting a pitch for it would be inventing data.
  confidence: number;
  voiced: boolean;
  // Root-mean-square level, for the input meter. Derived here so the raw samples
  // never have to leave this function.
  level: number;
};

export type PitchDetectOptions = {
  sampleRate: number;
  // A frame quieter than this is not an attempt to sing.
  silenceLevel?: number;
  // Autocorrelation peak below this is not a pitch worth reporting.
  voicingThreshold?: number;
  // The range searched. Wider costs time and invites octave errors; this covers
  // the human singing range with room either side.
  minHertz?: number;
  maxHertz?: number;
};

const SILENCE_LEVEL = 0.008;
const VOICING_THRESHOLD = 0.6;
// E1 to C7 — below any singer, above any singer.
const MIN_HERTZ = 41;
const MAX_HERTZ = 2100;

const SILENT: PitchEstimate = { hertz: 0, confidence: 0, voiced: false, level: 0 };

function rootMeanSquare(samples: Float32Array): number {
  let total = 0;
  for (const sample of samples) total += sample * sample;
  return Math.sqrt(total / Math.max(1, samples.length));
}

// Detects the pitch of one frame. Returns an unvoiced estimate rather than a
// guess whenever the frame is too quiet or too noisy to be a sung note.
export function detectPitch(samples: Float32Array, options: PitchDetectOptions): PitchEstimate {
  const {
    sampleRate,
    silenceLevel = SILENCE_LEVEL,
    voicingThreshold = VOICING_THRESHOLD,
    minHertz = MIN_HERTZ,
    maxHertz = MAX_HERTZ,
  } = options;

  const level = rootMeanSquare(samples);
  if (samples.length < 4 || sampleRate <= 0) return SILENT;
  if (level < silenceLevel) return { ...SILENT, level };

  const minLag = Math.max(2, Math.floor(sampleRate / maxHertz));
  const maxLag = Math.min(samples.length - 1, Math.ceil(sampleRate / minHertz));
  if (maxLag <= minLag) return { ...SILENT, level };

  // Energy at zero lag, for normalising: without it, a loud frame would look
  // more confident than a quiet one at the same pitch.
  let zeroLagEnergy = 0;
  for (const sample of samples) zeroLagEnergy += sample * sample;
  if (zeroLagEnergy === 0) return { ...SILENT, level };

  const scores = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    scores[lag] = correlationAt(samples, lag, zeroLagEnergy);
  }

  // Step past the opening shoulder. At tiny lags the signal has barely moved,
  // so the normalized correlation starts near 1 and falls — and treating that
  // descent as a peak would report the shortest lag searched, which is a pitch
  // several octaves above anything sung. The period only begins to matter once
  // the correlation has come back down through zero.
  let lag = minLag;
  while (lag <= maxLag && (scores[lag] as number) > 0) lag += 1;

  // The first local maximum above the voicing threshold is the period. Not the
  // tallest: a periodic signal correlates just as well at twice its period, and
  // preferring the tallest peak is exactly how a detector lands an octave low.
  let bestLag = -1;
  let bestScore = 0;
  for (; lag <= maxLag - 1; lag += 1) {
    const score = scores[lag] as number;
    if (score < voicingThreshold) continue;
    if (score >= (scores[lag - 1] as number) && score >= (scores[lag + 1] as number)) {
      bestLag = lag;
      bestScore = score;
      break;
    }
  }

  if (bestLag < 0) return { ...SILENT, level };

  // Parabolic interpolation around the peak, so the estimate is not quantized
  // to whole samples — at 44.1kHz a whole-sample step near A4 is about 5 cents,
  // which would show up as a learner being flat when they are not.
  const refined = refineLag(samples, bestLag, zeroLagEnergy);
  const hertz = sampleRate / refined;
  if (hertz < minHertz || hertz > maxHertz) return { ...SILENT, level };

  return { hertz, confidence: Math.min(1, Math.max(0, bestScore)), voiced: true, level };
}

function correlationAt(samples: Float32Array, lag: number, zeroLagEnergy: number): number {
  if (lag < 1 || lag >= samples.length) return 0;
  let correlation = 0;
  let laggedEnergy = 0;
  const limit = samples.length - lag;
  for (let index = 0; index < limit; index += 1) {
    const a = samples[index] as number;
    const b = samples[index + lag] as number;
    correlation += a * b;
    laggedEnergy += b * b;
  }
  const norm = Math.sqrt(zeroLagEnergy * laggedEnergy);
  return norm === 0 ? 0 : correlation / norm;
}

function refineLag(samples: Float32Array, lag: number, zeroLagEnergy: number): number {
  const before = correlationAt(samples, lag - 1, zeroLagEnergy);
  const at = correlationAt(samples, lag, zeroLagEnergy);
  const after = correlationAt(samples, lag + 1, zeroLagEnergy);
  const denominator = 2 * (2 * at - before - after);
  if (denominator === 0) return lag;
  const shift = (after - before) / denominator;
  // A correction of more than half a sample means the peak is not where we
  // think it is; trust the integer lag rather than extrapolating.
  return Math.abs(shift) > 0.5 ? lag : lag + shift;
}

const A4_HERTZ = 440;
const A4_MIDI = 69;

// Fractional MIDI, so "how far off" is answerable. Deliberately not rounded:
// rounding here would throw away the very error the learner needs to see.
export function hertzToMidi(hertz: number): number {
  if (hertz <= 0) return 0;
  return A4_MIDI + 12 * Math.log2(hertz / A4_HERTZ);
}

export function midiToHertz(midi: number): number {
  return A4_HERTZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

// Signed cents between a sung pitch and its target. Negative is flat.
export function centsBetween(sungHertz: number, targetHertz: number): number {
  if (sungHertz <= 0 || targetHertz <= 0) return 0;
  return 1200 * Math.log2(sungHertz / targetHertz);
}
