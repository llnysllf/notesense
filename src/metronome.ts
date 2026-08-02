// The metronome and the clock a rhythm round is measured against.
//
// Clicks are scheduled ahead on the audio clock rather than fired from a timer,
// because setInterval drifts and stutters under load — and a metronome that
// drifts makes the learner's timing look wrong when it is not. Taps are stamped
// from the same clock, so a tap and a click are directly comparable without
// crossing timebases.

export type RhythmClock = {
  // Audio-clock seconds since the pattern started. Negative during the
  // count-in, so a tap before the first beat is recognisably not part of the
  // performance.
  now: () => number;
  // How long until the pattern begins: the count-in plus the small scheduling
  // lead the metronome needs. Callers that must know when the round ends should
  // use this rather than re-deriving it, which would couple them to that lead.
  secondsUntilStart: number;
  stop: () => void;
};

export type MetronomeOptions = {
  bpm: number;
  beatsPerBar: number;
  // Bars of count-in before the pattern starts. The learner needs the pulse
  // established before being asked to join it.
  countInBars?: number;
  onBeat?: (beat: { index: number; isDownbeat: boolean; isCountIn: boolean }) => void;
};

const LOOKAHEAD_SECONDS = 0.1;
const SCHEDULE_INTERVAL_MS = 25;
const ACCENT_HZ = 1600;
const CLICK_HZ = 1000;

function click(context: AudioContext, at: number, accent: boolean): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(accent ? ACCENT_HZ : CLICK_HZ, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.16, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.06);
}

// Starts the metronome and returns a clock whose zero is the first beat *after*
// the count-in, so a tap's timestamp lines up with the pattern's own timeline.
export function startMetronome(context: AudioContext, options: MetronomeOptions): RhythmClock {
  const { bpm, beatsPerBar, countInBars = 1, onBeat } = options;
  const beatSeconds = 60 / Math.max(1, bpm);
  const countInBeats = Math.max(0, countInBars) * beatsPerBar;

  const startedAt = context.currentTime + 0.15;
  const zeroAt = startedAt + countInBeats * beatSeconds;

  let nextBeat = 0;
  let timer: number | null = null;
  const notificationTimers = new Set<number>();

  const pump = () => {
    while (startedAt + nextBeat * beatSeconds < context.currentTime + LOOKAHEAD_SECONDS) {
      const at = startedAt + nextBeat * beatSeconds;
      const isCountIn = nextBeat < countInBeats;
      const beatInBar = (nextBeat - countInBeats) % beatsPerBar;
      const isDownbeat = isCountIn ? nextBeat % beatsPerBar === 0 : beatInBar === 0;
      const beatIndex = nextBeat - countInBeats;

      click(context, at, isDownbeat);
      // Scheduling happens ahead of audibility. Notify consumers at the beat,
      // not when its oscillator was queued, so visual or accessibility cues do
      // not lead the click by the look-ahead window.
      const notification = window.setTimeout(
        () => {
          notificationTimers.delete(notification);
          onBeat?.({ index: beatIndex, isDownbeat, isCountIn });
        },
        Math.max(0, (at - context.currentTime) * 1000),
      );
      notificationTimers.add(notification);
      nextBeat += 1;
    }
  };

  pump();
  timer = window.setInterval(pump, SCHEDULE_INTERVAL_MS);

  return {
    now: () => context.currentTime - zeroAt,
    secondsUntilStart: zeroAt - context.currentTime,
    stop: () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      for (const notification of notificationTimers) window.clearTimeout(notification);
      notificationTimers.clear();
    },
  };
}
