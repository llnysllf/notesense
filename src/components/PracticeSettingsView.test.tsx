import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../storage";
import { BUILT_IN_SOUND_WORLDS, DEFAULT_SOUND_WORLD_ID, type PracticeSettings } from "../types";
import PracticeSettingsView from "./PracticeSettingsView";

function makeSettings(overrides: Partial<PracticeSettings> = {}): PracticeSettings {
  return {
    ...defaultSettings,
    ...overrides,
  };
}

function renderSettingsView(overrides: Partial<Parameters<typeof PracticeSettingsView>[0]> = {}) {
  const props = {
    mode: "reading" as const,
    rangeDetail: "Treble clef C4-G4",
    settings: makeSettings(),
    midi: {
      support: "unsupported" as const,
      status: "unavailable" as const,
      devices: [],
      selectedId: null,
      latencyMs: 0,
      onConnect: () => {},
      onDisconnect: () => {},
      onSelectDevice: () => {},
      onSetLatencyMs: () => {},
    },
    sound: {
      worlds: BUILT_IN_SOUND_WORLDS,
      activeId: DEFAULT_SOUND_WORLD_ID,
      notice: null,
      select: () => {},
      preview: () => {},
    },
    onSettingsChange: vi.fn(),
    ...overrides,
  };

  return { ...render(<PracticeSettingsView {...props} />), props };
}

describe("PracticeSettingsView", () => {
  it("renders the round length options with the active length pressed", () => {
    renderSettingsView({ settings: makeSettings({ roundLength: 60 }) });

    expect(screen.getByRole("button", { name: "60s" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "90s" })).toHaveAttribute("aria-pressed", "false");
  });

  it("patches the round length", () => {
    const { props } = renderSettingsView();

    fireEvent.click(screen.getByRole("button", { name: "90s" }));
    expect(props.onSettingsChange).toHaveBeenCalledWith({ roundLength: 90 });
  });

  it("patches each practice toggle", () => {
    const { props } = renderSettingsView({
      settings: makeSettings({ adaptivePractice: true, autoPlayPitch: false, revealPitchAfterAnswer: true }),
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Adaptive practice" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Auto-play pitch" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Reveal pitch answer" }));

    expect(props.onSettingsChange).toHaveBeenNthCalledWith(1, { adaptivePractice: false });
    expect(props.onSettingsChange).toHaveBeenNthCalledWith(2, { autoPlayPitch: true });
    expect(props.onSettingsChange).toHaveBeenNthCalledWith(3, { revealPitchAfterAnswer: false });
  });

  it("shows reading range controls in reading mode", () => {
    renderSettingsView({
      mode: "reading",
      rangeControls: <div data-testid="reading-range-controls" />,
    });

    expect(screen.getByRole("heading", { name: "Reading range" })).toBeInTheDocument();
    expect(screen.getByTestId("reading-range-controls")).toBeInTheDocument();
    expect(screen.getByText("Treble clef C4-G4 note reading.")).toBeInTheDocument();
  });

  it("shows pitch controls and describes the active pitch range", () => {
    renderSettingsView({
      mode: "pitch",
      rangeDetail: "Chromatic pitches C4-B4",
      rangeControls: <div data-testid="pitch-range-controls" />,
    });

    expect(screen.getByTestId("pitch-range-controls")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pitch training" })).toBeInTheDocument();
    expect(screen.getByText("Chromatic pitches C4-B4 pitch recognition.")).toBeInTheDocument();
  });
});
