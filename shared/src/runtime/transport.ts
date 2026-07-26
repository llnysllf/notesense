// The clock + scheduler the runtime uses for count-in, playback, and timing.
// Named RuntimeTransport to stay distinct from the musical Transport (PPQ). The
// browser adapter (later slice) implements this over the Web Audio clock; the
// manual implementation here is deterministic for tests and for driving the
// runtime without a real audio thread.

export type RuntimeTransport = {
  // Current time in audio-clock seconds.
  now(): number;
  // Runs the callback when the clock reaches atSeconds; returns a cancel handle.
  schedule(atSeconds: number, callback: () => void): () => void;
};

export type ManualTransport = RuntimeTransport & {
  // Advances the clock to `seconds`, firing every due callback in time order.
  advanceTo(seconds: number): void;
};

type Scheduled = { at: number; callback: () => void; cancelled: boolean };

// A deterministic transport with no wall clock or audio thread. Time only moves
// when advanceTo is called, so tests are exact and reproducible.
export function createManualTransport(startSeconds = 0): ManualTransport {
  let current = startSeconds;
  let queue: Scheduled[] = [];

  return {
    now: () => current,
    schedule(atSeconds, callback) {
      const entry: Scheduled = { at: atSeconds, callback, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    advanceTo(seconds) {
      if (seconds < current) return;
      const due = queue.filter((entry) => !entry.cancelled && entry.at <= seconds).sort((a, b) => a.at - b.at);
      queue = queue.filter((entry) => !entry.cancelled && entry.at > seconds);
      current = seconds;
      for (const entry of due) entry.callback();
    },
  };
}
