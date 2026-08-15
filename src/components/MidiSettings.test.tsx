import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MidiSettings from "./MidiSettings";
import type { MidiStatus, MidiSupport } from "../midi/webMidi";

type Props = Parameters<typeof MidiSettings>[0];

function renderSettings(overrides: Partial<Props> = {}) {
  const props: Props = {
    support: "available" as MidiSupport,
    status: "idle" as MidiStatus,
    devices: [],
    selectedId: null,
    latencyMs: 0,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onSelectDevice: vi.fn(),
    onSetLatencyMs: vi.fn(),
    ...overrides,
  };
  render(<MidiSettings {...props} />);
  return props;
}

describe("MidiSettings", () => {
  it("offers a connection when the browser supports it", () => {
    renderSettings();

    expect(screen.getByRole("heading", { name: "Digital piano" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect a piano" })).toBeEnabled();
  });

  it("connects only when asked, since the prompt needs a gesture", () => {
    const props = renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Connect a piano" }));

    expect(props.onConnect).toHaveBeenCalledTimes(1);
  });

  it("says which browsers work and that the rest of the app still does", () => {
    renderSettings({ support: "unsupported" });

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/Chrome, Edge, and Opera/);
    expect(note).toHaveTextContent(/Safari and Firefox do not/);
    // The unsupported state must not read as the app being broken.
    expect(note).toHaveTextContent(/works without it/i);
    expect(screen.queryByRole("button", { name: /connect/i })).not.toBeInTheDocument();
  });

  it("explains that a piano needs a secure connection", () => {
    renderSettings({ support: "insecure-context" });

    expect(screen.getByRole("note")).toHaveTextContent(/secure \(https\) connection/i);
  });

  it("tells the learner what happened when access was refused", () => {
    renderSettings({ status: "denied" });

    // Not silence, and not a dead end: it says the keyboard still works.
    expect(screen.getByText(/did not get it/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect a piano" })).toBeInTheDocument();
  });

  it("does not offer a second attempt while one is in flight", () => {
    renderSettings({ status: "connecting" });

    expect(screen.getByRole("button", { name: "Connect a piano" })).toBeDisabled();
  });

  it("lets the learner pick between instruments once connected", () => {
    const props = renderSettings({
      status: "connected",
      devices: [
        { id: "a", name: "Studio 88 (1)" },
        { id: "b", name: "Studio 88 (2)" },
      ],
      selectedId: "a",
    });

    expect(screen.getByText(/2 devices found/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Instrument"), { target: { value: "b" } });
    expect(props.onSelectDevice).toHaveBeenCalledWith("b");
  });

  it("says when timing is being corrected, and disconnects on request", () => {
    const props = renderSettings({
      status: "connected",
      devices: [{ id: "a", name: "Piano" }],
      selectedId: "a",
      latencyMs: 90,
    });

    expect(screen.getByText(/corrected for a 90ms delay/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(props.onDisconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps a timing correction on the current device", () => {
    const props = renderSettings({ status: "connected", devices: [{ id: "a", name: "Piano" }], selectedId: "a" });

    fireEvent.change(screen.getByLabelText("Timing correction (ms)"), { target: { value: "85" } });
    expect(props.onSetLatencyMs).toHaveBeenCalledWith(85);
  });

  it("offers a guided timing measurement when a piano is connected", () => {
    const calibration = { state: "idle" as const, samples: 0, message: null, start: vi.fn(), cancel: vi.fn() };
    renderSettings({ status: "connected", devices: [{ id: "a", name: "Piano" }], selectedId: "a", calibration });

    fireEvent.click(screen.getByRole("button", { name: "Measure piano timing" }));
    expect(calibration.start).toHaveBeenCalledOnce();
  });
});
