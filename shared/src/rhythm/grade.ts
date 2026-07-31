// Grading a played rhythm.
//
// This is the one place the two timebases meet. Expected onsets are musical
// time (integer ticks, authored and invariant). Played onsets are performed time
// (audio-clock seconds, measured and device-dependent). Grading projects the
// expected onsets onto seconds at the round's tempo, corrects the played onsets
// for measured input latency, and matches the two.
//
// Components are reported separately on purpose. "68%" tells a learner nothing;
// "you were consistently early, and you dropped two notes" tells them what to do.

import { ticksToSeconds } from "../music/compileTimeline";
import { TRANSPORT_V1, type Transport } from "../music/time";

export type TapVerdict = "early" | "on-time" | "late" | "missed";

export type OnsetResult = {
  expectedSeconds: number;
  // Absent when nothing was played for this onset.
  playedSeconds?: number;
  // Signed: negative is early, positive is late.
  errorMs?: number;
  verdict: TapVerdict;
};

export type RhythmScore = {
  onsets: OnsetResult[];
  // How many expected onsets were played inside the tolerance band.
  onTime: number;
  expectedCount: number;
  // Taps that matched no expected onset.
  extraTaps: number;
  // 0..1 share of expected onsets played in time.
  onsetAccuracy: number;
  // 0..1, how consistent the timing error was. High accuracy with a steady
  // offset is a latency problem; low steadiness is a pulse problem, and the
  // learner should be told which.
  pulseSteadiness: number;
  // Mean signed error, so a systematic rush or drag is visible.
  meanErrorMs: number;
  // 0..1 share of the pattern reached before the learner stopped.
  completion: number;
};

export type GradeOptions = {
  expectedTicks: readonly number[];
  playedSeconds: readonly number[];
  bpm: number;
  transport?: Transport;
  // Measured device round-trip, subtracted from every played onset.
  latencyMs?: number;
  // Half-band for "on time". Defaults to a fraction of the beat so the
  // tolerance stays musically sensible at any tempo, clamped so it is neither
  // impossible when fast nor meaningless when slow.
  toleranceMs?: number;
};

const MIN_TOLERANCE_MS = 60;
const MAX_TOLERANCE_MS = 200;
const BEAT_FRACTION = 0.25;
const FEEDBACK_WINDOW_MULTIPLIER = 2;

// A quarter of a beat, clamped. At 120bpm that is 125ms; at 200bpm it floors at
// 60ms rather than shrinking to something no human can hit.
export function toleranceForTempo(bpm: number): number {
  const beatMs = 60_000 / Math.max(1, bpm);
  return Math.min(MAX_TOLERANCE_MS, Math.max(MIN_TOLERANCE_MS, beatMs * BEAT_FRACTION));
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function gradeRhythm({
  expectedTicks,
  playedSeconds,
  bpm,
  transport = TRANSPORT_V1,
  latencyMs = 0,
  toleranceMs,
}: GradeOptions): RhythmScore {
  const tolerance = toleranceMs ?? toleranceForTempo(bpm);
  const expectedSeconds = expectedTicks.map((ticks) => ticksToSeconds(ticks, bpm, transport));
  // Correcting the input, not the expectation: the score is a device-independent
  // statement about the performance.
  const corrected = playedSeconds.map((seconds) => seconds - latencyMs / 1000).sort((a, b) => a - b);

  const used = new Set<number>();
  const onsets: OnsetResult[] = expectedSeconds.map((expected) => {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < corrected.length; index += 1) {
      if (used.has(index)) continue;
      const distance = Math.abs((corrected[index] as number) - expected);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    // Keep a wider, bounded feedback band than the on-time band. A near
    // miss is useful information (early or late); a distant tap is an extra
    // tap and the expected onset is genuinely missed.
    if (bestIndex === -1 || bestDistance > (tolerance * FEEDBACK_WINDOW_MULTIPLIER) / 1000) {
      return { expectedSeconds: expected, verdict: "missed" };
    }

    used.add(bestIndex);
    const played = corrected[bestIndex] as number;
    const errorMs = (played - expected) * 1000;
    const verdict: TapVerdict = Math.abs(errorMs) <= tolerance ? "on-time" : errorMs < 0 ? "early" : "late";
    return { expectedSeconds: expected, playedSeconds: played, errorMs, verdict };
  });

  const matched = onsets.filter((onset) => onset.errorMs !== undefined);
  const errors = matched.map((onset) => onset.errorMs as number);
  const onTime = onsets.filter((onset) => onset.verdict === "on-time").length;
  const expectedCount = expectedSeconds.length;

  // Completion is how far in they got, not how much they got right: stopping
  // halfway is a different problem from playing it badly.
  const lastMatched = onsets.reduce((last, onset, index) => (onset.errorMs === undefined ? last : index + 1), 0);

  return {
    onsets,
    onTime,
    expectedCount,
    extraTaps: Math.max(0, corrected.length - used.size),
    onsetAccuracy: expectedCount === 0 ? 0 : onTime / expectedCount,
    // Spread of a quarter-band or more counts as no steadiness left.
    pulseSteadiness:
      errors.length < 2 ? (errors.length === 1 ? 1 : 0) : Math.max(0, 1 - standardDeviation(errors) / tolerance),
    meanErrorMs: errors.length === 0 ? 0 : errors.reduce((total, value) => total + value, 0) / errors.length,
    completion: expectedCount === 0 ? 0 : lastMatched / expectedCount,
  };
}

// A plain-language read of the result, or undefined when there is nothing to
// say. Systematic offset is called out before accuracy, because a learner who is
// steadily 90ms early has a different job from one who is scattered.
export function describeRhythm(score: RhythmScore, toleranceMs: number): string | undefined {
  if (score.expectedCount === 0) return undefined;
  if (score.onTime === 0 && score.extraTaps === 0) return "Nothing landed in time yet — try counting the pulse first.";

  const drift = Math.round(score.meanErrorMs);
  if (Math.abs(drift) > toleranceMs / 2) {
    return drift < 0
      ? `Consistently ${Math.abs(drift)}ms early — wait for the beat.`
      : `Consistently ${drift}ms late — anticipate the beat.`;
  }
  if (score.pulseSteadiness < 0.5) return "Your timing is uneven — steady the pulse before adding speed.";
  if (score.onsetAccuracy < 1) return "Close. A few notes fell outside the tolerance band.";
  return "Steady and in time.";
}
