// Measuring the round trip between a metronome click and the note arriving.
//
// Every device adds delay — the instrument's own scanning, USB or Bluetooth
// transport, and the browser's event loop — and it is systematic, not random.
// Without measuring it the rhythm engine reports a learner as consistently late
// when the hardware was late, which is the difference between useful feedback
// and blaming someone for their equipment.
//
// The estimate is a median, not a mean: one distracted tap should not move it.

export type LatencySample = {
  // When the click was scheduled, in audio-clock seconds.
  expectedSeconds: number;
  // When the note actually arrived, in the same timebase.
  observedSeconds: number;
};

export type LatencyEstimate = {
  latencyMs: number;
  // Spread of the samples. A wide spread means the learner was not playing
  // along accurately enough for the number to mean anything.
  spreadMs: number;
  sampleCount: number;
  // Whether the estimate is trustworthy enough to apply.
  isReliable: boolean;
};

// Fewer samples than this cannot distinguish a device offset from a bad take.
export const MIN_LATENCY_SAMPLES = 4;
// Beyond this spread the learner was not playing along closely enough.
export const MAX_RELIABLE_SPREAD_MS = 60;
// A device slower than this is more likely a mis-measurement than hardware.
export const MAX_PLAUSIBLE_LATENCY_MS = 400;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number);
}

// Median absolute deviation, which is the spread measure that matches a median
// centre and does not get dragged by one outlier.
function medianAbsoluteDeviation(values: readonly number[], centre: number): number {
  if (values.length === 0) return 0;
  return median(values.map((value) => Math.abs(value - centre)));
}

export function estimateLatency(samples: readonly LatencySample[]): LatencyEstimate {
  const offsetsMs = samples.map((sample) => (sample.observedSeconds - sample.expectedSeconds) * 1000);
  const latencyMs = median(offsetsMs);
  const spreadMs = medianAbsoluteDeviation(offsetsMs, latencyMs);

  // A negative result means notes arrived before the click, which is not
  // latency; it is a learner anticipating the beat, so there is nothing to
  // correct for.
  const isReliable =
    samples.length >= MIN_LATENCY_SAMPLES &&
    spreadMs <= MAX_RELIABLE_SPREAD_MS &&
    latencyMs >= 0 &&
    latencyMs <= MAX_PLAUSIBLE_LATENCY_MS;

  return { latencyMs: Math.round(latencyMs), spreadMs: Math.round(spreadMs), sampleCount: samples.length, isReliable };
}

// What to tell the learner. Says why a measurement was rejected rather than
// silently discarding it, because "try again" with no reason is not guidance.
export function describeLatency(estimate: LatencyEstimate): string {
  if (estimate.sampleCount < MIN_LATENCY_SAMPLES) {
    return `Play along with a few more clicks (${estimate.sampleCount} of ${MIN_LATENCY_SAMPLES}).`;
  }
  if (estimate.latencyMs < 0) {
    return "You are playing ahead of the click rather than with it, so there is nothing to calibrate.";
  }
  if (estimate.latencyMs > MAX_PLAUSIBLE_LATENCY_MS) {
    return "That delay is too large to be your device. Check the connection and try again.";
  }
  if (estimate.spreadMs > MAX_RELIABLE_SPREAD_MS) {
    return "Your timing varied too much to measure the delay. Play as steadily as you can.";
  }
  return `Your setup is about ${estimate.latencyMs}ms behind. Timing will be corrected by that much.`;
}
