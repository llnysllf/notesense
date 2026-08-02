// The clock an assessment run is measured against.
//
// A Reading Score needs a count-in and a shared timebase, exactly like a rhythm
// round, so it uses the same metronome. What it adds is a fallback: if audio is
// unavailable — blocked, refused, or absent — the assessment still runs on the
// performance clock rather than refusing to start. A learner who cannot hear the
// click can still be asked to read, and saying "no audio, no test" would be a
// worse answer than a silent count-in.

import { startMetronome, type RhythmClock } from "./metronome";

export type AssessmentClockOptions = {
  bpm: number;
  beatsPerBar: number;
  countInBars?: number;
  // Fires when the count-in ends and the passage begins.
  onStart: () => void;
};

export type AssessmentClock = RhythmClock & { isAudible: boolean };

function createAudioContext(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

// A silent clock with the same contract as the metronome's, so callers never
// branch on which one they got.
function startSilentClock({ bpm, beatsPerBar, countInBars = 1, onStart }: AssessmentClockOptions): AssessmentClock {
  const countInSeconds = (60 / Math.max(1, bpm)) * Math.max(0, countInBars) * beatsPerBar;
  const zeroAt = performance.now() / 1000 + countInSeconds;
  const timer = window.setTimeout(onStart, countInSeconds * 1000);

  return {
    isAudible: false,
    now: () => performance.now() / 1000 - zeroAt,
    secondsUntilStart: countInSeconds,
    stop: () => window.clearTimeout(timer),
  };
}

export function startAssessmentClock(options: AssessmentClockOptions): AssessmentClock {
  const context = createAudioContext();
  if (!context) return startSilentClock(options);

  void context.resume?.();
  const clock = startMetronome(context, {
    bpm: options.bpm,
    beatsPerBar: options.beatsPerBar,
    ...(options.countInBars === undefined ? {} : { countInBars: options.countInBars }),
    onBeat: ({ index, isCountIn }) => {
      // The first beat of the passage itself, not every beat after it.
      if (!isCountIn && index === 0) options.onStart();
    },
  });

  return {
    ...clock,
    isAudible: true,
    stop: () => {
      clock.stop();
      void context.close?.();
    },
  };
}
