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
} from "../midi/webMidi";

export type { MidiStatus } from "../midi/webMidi";
import { createMidiAdapter, type InputEvent } from "../types";

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
};

export type UseMidiInputOptions = {
  // Audio-clock time, shared with the rhythm engine so a played note and a
  // metronome click are directly comparable.
  now: () => number;
  onInput: (event: InputEvent) => void;
};

export function useMidiInput({ now, onInput }: UseMidiInputOptions): UseMidiInput {
  const [support] = useState<MidiSupport>(() => detectMidiSupport());
  const [status, setStatus] = useState<MidiStatus>(() =>
    detectMidiSupport() === "available" ? "idle" : "unavailable",
  );
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState(0);

  const connectionRef = useRef<MidiConnection | null>(null);
  const adapterRef = useRef(createMidiAdapter());
  // Held in refs so re-rendering never detaches a live device, and written in an
  // effect because a ref must not be touched during render.
  const nowRef = useRef(now);
  const onInputRef = useRef(onInput);
  useEffect(() => {
    nowRef.current = now;
    onInputRef.current = onInput;
  }, [now, onInput]);

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
        for (const event of adapterRef.current.accept(data, atSeconds)) onInputRef.current(event);
      });
    });
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    connectionRef.current?.select(deviceId);
    setSelectedId(deviceId);
    adapterRef.current.reset();
  }, []);

  return { support, status, devices, selectedId, latencyMs, connect, disconnect, selectDevice, setLatencyMs };
}
