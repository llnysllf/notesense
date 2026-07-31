import type { MidiPanelProps, MidiStatus, MidiSupport } from "../midi/webMidi";

// Connecting a digital piano.
//
// When MIDI is not available the panel says why and what still works, rather
// than hiding or silently disabling itself: a control that vanishes reads as a
// bug, and one that does nothing reads as broken.

const SUPPORT_MESSAGES: Record<Exclude<MidiSupport, "available">, string> = {
  unsupported:
    "This browser cannot connect to a piano. Chrome, Edge, and Opera support it today; Safari and Firefox do not. Everything else in NoteSense works without it.",
  "insecure-context": "Connecting a piano needs a secure (https) connection. The on-screen keyboard works either way.",
};

const STATUS_MESSAGES: Partial<Record<MidiStatus, string>> = {
  connecting: "Asking for permission…",
  denied: "No piano connected. NoteSense asked for access and did not get it — the on-screen keyboard still works.",
};

function MidiSettings({
  support,
  status,
  devices,
  selectedId,
  latencyMs,
  onConnect,
  onDisconnect,
  onSelectDevice,
  onSetLatencyMs,
}: MidiPanelProps) {
  return (
    <section className="midi-settings" aria-labelledby="midi-heading">
      <h3 id="midi-heading">Digital piano</h3>

      {support !== "available" ? (
        <p className="midi-note" role="note">
          {SUPPORT_MESSAGES[support]}
        </p>
      ) : (
        <>
          <p className="midi-status" aria-live="polite">
            {status === "connected"
              ? `Connected${devices.length > 1 ? ` — ${devices.length} devices found` : ""}`
              : (STATUS_MESSAGES[status] ?? "Play NoteSense on your own piano over USB.")}
          </p>

          {status === "connected" && devices.length > 0 ? (
            <label className="midi-device-picker">
              <span>Instrument</span>
              <select value={selectedId ?? ""} onChange={(event) => onSelectDevice(event.target.value)}>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {status === "connected" && latencyMs > 0 ? (
            <p className="midi-note">Timing is corrected for a {latencyMs}ms delay on this device.</p>
          ) : null}

          {status === "connected" ? (
            <label className="midi-device-picker">
              <span>Timing correction (ms)</span>
              <input
                type="number"
                min="0"
                max="400"
                step="1"
                value={latencyMs}
                onChange={(event) => onSetLatencyMs(Number(event.target.value))}
              />
            </label>
          ) : null}

          <button
            type="button"
            className="secondary-button"
            onClick={status === "connected" ? onDisconnect : onConnect}
            disabled={status === "connecting"}
          >
            {status === "connected" ? "Disconnect" : "Connect a piano"}
          </button>
        </>
      )}
    </section>
  );
}

export default MidiSettings;
