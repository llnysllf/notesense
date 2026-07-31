// Running a rhythm round: start the metronome, collect taps on the audio clock,
// grade them when the pattern ends.
//
// Taps are stamped from the metronome's own clock rather than from Date.now(),
// so what is compared is a performance against a pulse, not two unrelated
// timebases.

import { useCallback, useEffect, useRef, useState } from "react";
import { startMetronome, type RhythmClock } from "../metronome";
import {
  generateRhythmPattern,
  gradeRhythm,
  patternLengthTicks,
  patternOnsetTicks,
  ticksToSeconds,
  toleranceForTempo,
  type RhythmPattern,
  type RhythmScore,
  type RhythmSessionView,
  type RhythmSettings,
} from "../types";

export type { RhythmSettings, RhythmSessionView } from "../types";

const createAudioContext = (): AudioContext | null => {
  try {
    return new AudioContext();
  } catch {
    // No audio available: the round still runs silently rather than crashing.
    return null;
  }
};

export function useRhythmSession(settings: RhythmSettings): RhythmSessionView {
  const [seed, setSeed] = useState(() => `${Date.now()}`);
  const [pattern, setPattern] = useState<RhythmPattern>(() =>
    generateRhythmPattern({ meter: settings.meter, bars: settings.bars, vocabulary: settings.vocabulary, seed }),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [score, setScore] = useState<RhythmScore | null>(null);

  const clockRef = useRef<RhythmClock | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const tapsRef = useRef<number[]>([]);
  const endTimerRef = useRef<number | null>(null);

  // The pattern is derived from the seed and the settings that shape it, so it
  // is recomputed during render when those change rather than a frame later.
  const patternKey = `${seed}|${settings.meter.beats}/${settings.meter.beatUnit}|${settings.bars}|${settings.vocabulary}`;
  const [lastPatternKey, setLastPatternKey] = useState(patternKey);
  if (patternKey !== lastPatternKey) {
    setLastPatternKey(patternKey);
    setPattern(
      generateRhythmPattern({ meter: settings.meter, bars: settings.bars, vocabulary: settings.vocabulary, seed }),
    );
  }

  const cleanup = useCallback(() => {
    clockRef.current?.stop();
    clockRef.current = null;
    if (endTimerRef.current !== null) window.clearTimeout(endTimerRef.current);
    endTimerRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setIsRunning(false);
    setIsCountingIn(false);
  }, [cleanup]);

  const start = useCallback(() => {
    cleanup();
    tapsRef.current = [];
    setScore(null);
    setIsRunning(true);
    setIsCountingIn(true);

    contextRef.current ??= createAudioContext();
    const context = contextRef.current;
    if (!context) {
      setIsCountingIn(false);
      return;
    }
    void context.resume?.();

    const expectedTicks = patternOnsetTicks(pattern);
    const lengthSeconds = ticksToSeconds(patternLengthTicks(pattern), settings.bpm);

    const clock = startMetronome(context, {
      bpm: settings.bpm,
      beatsPerBar: pattern.meter.beats,
      onBeat: ({ isCountIn }) => {
        if (!isCountIn) setIsCountingIn(false);
      },
    });
    clockRef.current = clock;

    // End a beat after the last note so a final tap still lands in its window.
    const beatSeconds = 60 / Math.max(1, settings.bpm);
    endTimerRef.current = window.setTimeout(
      () => {
        setScore(gradeRhythm({ expectedTicks, playedSeconds: tapsRef.current, bpm: settings.bpm }));
        stop();
      },
      Math.max(0, clock.secondsUntilStart + lengthSeconds + beatSeconds) * 1000,
    );
  }, [cleanup, pattern, settings.bpm, stop]);

  const tap = useCallback(() => {
    const clock = clockRef.current;
    if (!clock) return;
    // Count-in taps are not part of the performance.
    const at = clock.now();
    if (at < 0) return;
    tapsRef.current.push(at);
  }, []);

  const newPattern = useCallback(() => {
    stop();
    setScore(null);
    setSeed(`${Date.now()}`);
  }, [stop]);

  return {
    pattern,
    isRunning,
    isCountingIn,
    score,
    toleranceMs: toleranceForTempo(settings.bpm),
    start,
    stop,
    tap,
    newPattern,
  };
}
