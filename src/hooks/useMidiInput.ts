// Connecting a piano and routing what it plays into the runtime.
//
// Connection is only attempted from a user gesture, because that is when a
// browser will show the permission prompt. Everything degrades quietly: an
// unsupported browser, a denied prompt, or an unplugged cable all leave the
// on-screen keyboard working exactly as before.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectMidiSupport,
  openMidi,
  type MidiConnection,
  type MidiDevice,
  type MidiStatus,
  type MidiSupport,
  type MidiCalibration,
} from "../midi/webMidi";

export type { MidiStatus } from "../midi/webMidi";
import { createMidiAdapter, describeLatency, estimateLatency, type InputEvent } from "../types";

export type UseMidiInput = {
  support: MidiSupport;
  status: MidiStatus;
  devices: MidiDevice[];
  selectedId: string | null;
  latencyMs: number;
  connect: () => void;
  disconnect: () => void;
  selectDevice: (deviceId: string) => void;
  setLatencyMs: (latencyMs: number) => void;
  calibration: import("../midi/webMidi").MidiCalibration;
};

export type UseMidiInputOptions = {
  // Audio-clock time, shared with the rhythm engine so a played note and a
  // metronome click are directly comparable.
  now: () => number;
  onInput: (event: InputEvent) => void;
  latencyMs?: number;
  onLatencyChange?: (latencyMs: number) => void;
};

export function useMidiInput({
  now,
  onInput,
  latencyMs: configuredLatencyMs = 0,
  onLatencyChange,
}: UseMidiInputOptions): UseMidiInput {
  const [support] = useState<MidiSupport>(() => detectMidiSupport());
  const [status, setStatus] = useState<MidiStatus>(() =>
    detectMidiSupport() === "available" ? "idle" : "unavailable",
  );
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<Pick<MidiCalibration, "state" | "samples" | "message">>({
    state: "idle",
    samples: 0,
    message: null,
  });
  const latencyMs = configuredLatencyMs;

  const connectionRef = useRef<MidiConnection | null>(null);
  const adapterRef = useRef(createMidiAdapter());
  const calibrationRef = useRef<{
    expected: number[];
    samples: { expectedSeconds: number; observedSeconds: number }[];
    timers: number[];
    context: AudioContext | null;
  }>({ expected: [], samples: [], timers: [], context: null });
  // Held in refs so re-rendering never detaches a live device, and written in an
  // effect because a ref must not be touched during render.
  const nowRef = useRef(now);
  const onInputRef = useRef(onInput);
  const onLatencyChangeRef = useRef(onLatencyChange);
  useEffect(() => {
    nowRef.current = now;
    onInputRef.current = onInput;
    onLatencyChangeRef.current = onLatencyChange;
  }, [now, onInput, onLatencyChange]);

  const disconnect = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    adapterRef.current.reset();
    setDevices([]);
    setSelectedId(null);
    setStatus(detectMidiSupport() === "available" ? "idle" : "unavailable");
  }, []);

  useEffect(() => disconnect, [disconnect]);

  // The adapter carries the latency correction, so it is rebuilt when the
  // measured value changes rather than correcting at every call site.
  useEffect(() => {
    adapterRef.current = createMidiAdapter({ latencyMs });
  }, [latencyMs]);

  const cancelCalibration = useCallback(() => {
    for (const timer of calibrationRef.current.timers) window.clearTimeout(timer);
    void calibrationRef.current.context?.close();
    calibrationRef.current = { expected: [], samples: [], timers: [], context: null };
    setCalibration({ state: "idle", samples: 0, message: null });
  }, []);

  const startCalibration = useCallback(() => {
    if (connectionRef.current === null) return;
    cancelCalibration();
    const context = new AudioContext();
    const expected = Array.from({ length: 6 }, (_, index) => performance.now() / 1000 + 0.8 + index * 0.75);
    calibrationRef.current = { expected, samples: [], timers: [], context };
    setCalibration({
      state: "running",
      samples: 0,
      message: "Listen for six clicks, then play one piano key with each click.",
    });

    for (const atSeconds of expected) {
      const timer = window.setTimeout(
        () => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.setValueAtTime(1200, context.currentTime);
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.045);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.05);
        },
        Math.max(0, (atSeconds - performance.now() / 1000) * 1000),
      );
      calibrationRef.current.timers.push(timer);
    }

    // Do not leave a learner in a permanently running state when they miss a
    // click. The estimator explains why the partial take was not accepted and
    // the button then offers a clean retry.
    const finishTimer = window.setTimeout(
      () => {
        const run = calibrationRef.current;
        if (run.expected !== expected) return;
        const estimate = estimateLatency(run.samples);
        void run.context?.close();
        run.expected = [];
        if (estimate.isReliable) onLatencyChangeRef.current?.(estimate.latencyMs);
        setCalibration({ state: "complete", samples: estimate.sampleCount, message: describeLatency(estimate) });
      },
      Math.max(0, (expected.at(-1)! + 0.5 - performance.now() / 1000) * 1000),
    );
    calibrationRef.current.timers.push(finishTimer);
  }, [cancelCalibration]);

  const connect = useCallback(() => {
    if (detectMidiSupport() !== "available") {
      setStatus("unavailable");
      return;
    }

    setStatus("connecting");
    void openMidi({ now: () => nowRef.current() }).then((connection) => {
      if (!connection) {
        // Denied or unavailable; the on-screen keyboard still works.
        setStatus("denied");
        return;
      }

      connectionRef.current = connection;
      setDevices(connection.devices);
      setSelectedId(connection.selectedId());
      setStatus("connected");

      connection.onDevicesChanged((next) => {
        setDevices(next);
        setSelectedId(connection.selectedId());
        // A device that vanished may have left keys "down".
        adapterRef.current.reset();
      });

      connection.onMessage((data, atSeconds) => {
        const run = calibrationRef.current;
        const isNoteOn = ((data[0] ?? 0) & 0xf0) === 0x90 && (data[2] ?? 0) > 0;
        if (calibrationRef.current.expected.length > 0 && isNoteOn) {
          const expected = run.expected.find(
            (candidate) =>
              !run.samples.some((sample) => sample.expectedSeconds === candidate) &&
              Math.abs(candidate - atSeconds) <= 0.4,
          );
          if (expected !== undefined) {
            run.samples.push({ expectedSeconds: expected, observedSeconds: atSeconds });
            setCalibration((current) => ({ ...current, samples: run.samples.length }));
            if (run.samples.length === run.expected.length) {
              const estimate = estimateLatency(run.samples);
              for (const timer of run.timers) window.clearTimeout(timer);
              void run.context?.close();
              run.expected = [];
              if (estimate.isReliable) onLatencyChangeRef.current?.(estimate.latencyMs);
              setCalibration({ state: "complete", samples: estimate.sampleCount, message: describeLatency(estimate) });
            }
          }
        }
        for (const event of adapterRef.current.accept(data, atSeconds)) onInputRef.current(event);
      });
    });
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    connectionRef.current?.select(deviceId);
    setSelectedId(deviceId);
    adapterRef.current.reset();
  }, []);

  const updateLatencyMs = useCallback(
    (nextLatencyMs: number) => {
      const safeLatencyMs = Math.min(400, Math.max(0, Math.round(nextLatencyMs)));
      onLatencyChange?.(safeLatencyMs);
    },
    [onLatencyChange],
  );

  return {
    support,
    status,
    devices,
    selectedId,
    latencyMs,
    connect,
    disconnect,
    selectDevice,
    setLatencyMs: updateLatencyMs,
    calibration: { ...calibration, start: startCalibration, cancel: cancelCalibration },
  };
}
