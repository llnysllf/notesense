// Talking to a real instrument.
//
// Web MIDI is permission-gated, requires a secure context, and is not available
// in every browser. All three are handled by asking at runtime rather than by
// hardcoding a browser list: a support matrix written today goes stale, but
// feature detection stays true.
//
// Device names come from the hardware and are shown only to the person who
// plugged it in; nothing about the device is stored or sent anywhere.

export type MidiSupport = "available" | "insecure-context" | "unsupported";

export type MidiDevice = { id: string; name: string };

// Where a connection attempt has got to, from the learner's point of view.
export type MidiStatus = "idle" | "connecting" | "connected" | "denied" | "unavailable";

// What the settings panel needs to render a connection. Declared beside the
// device layer so a hook can shape it without importing a component.
export type MidiPanelProps = {
  support: MidiSupport;
  status: MidiStatus;
  devices: MidiDevice[];
  selectedId: string | null;
  latencyMs: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectDevice: (deviceId: string) => void;
};

export type MidiConnection = {
  devices: MidiDevice[];
  /** Fires for every incoming message from the selected device. */
  onMessage: (listener: (data: Uint8Array, atSeconds: number) => void) => () => void;
  /** Fires whenever devices are plugged in or removed. */
  onDevicesChanged: (listener: (devices: MidiDevice[]) => void) => () => void;
  select: (deviceId: string | null) => void;
  selectedId: () => string | null;
  close: () => void;
};

type MidiAccessLike = {
  inputs: Map<string, { id: string; name?: string | null; manufacturer?: string | null; onmidimessage: unknown }>;
  onstatechange: unknown;
};

// Reports why MIDI is unavailable rather than only that it is, so the UI can
// tell a learner something they can act on.
export function detectMidiSupport(): MidiSupport {
  if (typeof navigator === "undefined" || typeof navigator.requestMIDIAccess !== "function") return "unsupported";
  // The API is gated on a secure context; over plain http the call exists but
  // will never succeed.
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure-context";
  return "available";
}

function describeDevice(input: { id: string; name?: string | null; manufacturer?: string | null }): MidiDevice {
  const name = [input.manufacturer, input.name].filter(Boolean).join(" ").trim();
  return { id: input.id, name: name.length > 0 ? name : "MIDI device" };
}

// Two identical keyboards report the same name, so the label is disambiguated
// for the learner rather than leaving them to guess which is which.
function labelDevices(devices: MidiDevice[]): MidiDevice[] {
  const counts = new Map<string, number>();
  return devices.map((device) => {
    const seen = (counts.get(device.name) ?? 0) + 1;
    counts.set(device.name, seen);
    const duplicated = devices.filter((other) => other.name === device.name).length > 1;
    return duplicated ? { ...device, name: `${device.name} (${seen})` } : device;
  });
}

export type OpenMidiOptions = {
  // Supplies the audio-clock time for an incoming message, so MIDI events share
  // the timebase the rhythm engine grades in.
  now: () => number;
};

// Requests access. Must be called from a user gesture: browsers will not show a
// permission prompt otherwise.
export async function openMidi({ now }: OpenMidiOptions): Promise<MidiConnection | null> {
  if (detectMidiSupport() !== "available") return null;

  let access: MidiAccessLike;
  try {
    access = (await navigator.requestMIDIAccess({ sysex: false })) as unknown as MidiAccessLike;
  } catch {
    // Denied, or no device subsystem. Either way the app carries on with touch.
    return null;
  }

  const messageListeners = new Set<(data: Uint8Array, atSeconds: number) => void>();
  const deviceListeners = new Set<(devices: MidiDevice[]) => void>();
  let selectedId: string | null = null;

  const listDevices = () => labelDevices([...access.inputs.values()].map(describeDevice));

  const attach = () => {
    for (const input of access.inputs.values()) {
      const handler =
        input.id === selectedId
          ? (event: { data: Uint8Array | null }) => {
              if (!event.data) return;
              const at = now();
              for (const listener of messageListeners) listener(event.data, at);
            }
          : null;
      (input as { onmidimessage: unknown }).onmidimessage = handler;
    }
  };

  const select = (deviceId: string | null) => {
    selectedId = deviceId;
    attach();
  };

  // Default to the first device so a learner with one keyboard needs no choice.
  const initial = listDevices();
  select(initial[0]?.id ?? null);

  (access as { onstatechange: unknown }).onstatechange = () => {
    const devices = listDevices();
    // A device that goes away should not leave the session pointing at it.
    if (selectedId !== null && !devices.some((device) => device.id === selectedId)) {
      selectedId = devices[0]?.id ?? null;
    }
    attach();
    for (const listener of deviceListeners) listener(devices);
  };

  return {
    devices: initial,
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onDevicesChanged(listener) {
      deviceListeners.add(listener);
      return () => deviceListeners.delete(listener);
    },
    select,
    selectedId: () => selectedId,
    close() {
      messageListeners.clear();
      deviceListeners.clear();
      selectedId = null;
      attach();
      (access as { onstatechange: unknown }).onstatechange = null;
    },
  };
}
