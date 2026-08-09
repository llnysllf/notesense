// Listening to the microphone.
//
// This is the only file in the app that touches audio input, and it is written
// so that raw audio has nowhere to go. A frame of samples is handed to the pure
// detector, one estimate comes back, and the buffer is reused for the next
// frame. Nothing keeps it, nothing copies it, and no code downstream of here
// ever receives it — so "we do not store or send your voice" is a property of
// the shape of the code rather than a promise in a privacy policy.
//
// Permission is requested only when the learner presses record, never on load.

import { detectPitch, hertzToMidi, type PitchFrame } from "../types";

export type MicSupport = "available" | "insecure-context" | "unsupported";

export type MicStatus = "idle" | "requesting" | "listening" | "denied" | "unavailable";

// What the settings and practice screens need. Declared here so a hook can
// shape it without importing a component.
export type MicPanelProps = {
  support: MicSupport;
  status: MicStatus;
  level: number;
  onStart: () => void;
  onStop: () => void;
};

export type MicSession = {
  stop: () => void;
};

export type MicOptions = {
  // Audio-clock seconds since listening began.
  onFrame: (frame: PitchFrame) => void;
  frameSize?: number;
};

const FRAME_SIZE = 2048;

// Reports why the microphone is unavailable rather than only that it is, so the
// screen can tell a learner something they can act on.
export function detectMicSupport(): MicSupport {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure-context";
  return "available";
}

function createContext(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

// Starts listening. Must be called from a user gesture: browsers will not show
// the permission prompt otherwise.
export async function startListening({ onFrame, frameSize = FRAME_SIZE }: MicOptions): Promise<MicSession | null> {
  if (detectMicSupport() !== "available") return null;

  let stream: MediaStream;
  try {
    // No echo cancellation or noise suppression: both are tuned for speech and
    // will fight a sustained sung note, bending the very pitch being measured.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch {
    // Denied, or no input device. Either way the app carries on without it.
    return null;
  }

  const context = createContext();
  if (!context) {
    for (const track of stream.getTracks()) track.stop();
    return null;
  }

  const source = context.createMediaStreamSource(stream);
  // An AnalyserNode rather than an AudioWorklet: the analyser is available
  // everywhere the microphone is, needs no separate module to load, and gives
  // exactly what the detector wants — a window of time-domain samples. A
  // worklet would move the same arithmetic off the main thread, which is worth
  // doing when the detector starts costing more than it does today.
  const analyser = context.createAnalyser();
  analyser.fftSize = frameSize;
  source.connect(analyser);

  // One buffer, reused for every frame. Nothing accumulates, so there is no
  // recording to leak even by accident.
  const samples = new Float32Array(analyser.fftSize);
  const startedAt = context.currentTime;
  let timer: number | null = null;

  const pump = () => {
    analyser.getFloatTimeDomainData(samples);
    const estimate = detectPitch(samples, { sampleRate: context.sampleRate });
    onFrame({
      atSeconds: context.currentTime - startedAt,
      midi: estimate.voiced ? hertzToMidi(estimate.hertz) : 0,
      confidence: estimate.confidence,
      voiced: estimate.voiced,
      level: estimate.level,
    });
  };

  timer = window.setInterval(pump, 20);

  return {
    stop() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      source.disconnect();
      // Releasing the tracks is what turns the browser's recording indicator
      // off. Leaving them open would keep the light on after the exercise ends,
      // which is both rude and alarming.
      for (const track of stream.getTracks()) track.stop();
      void context.close?.();
    },
  };
}
