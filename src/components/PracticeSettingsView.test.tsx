import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PracticeSettings } from "../types";
import PracticeSettingsView from "./PracticeSettingsView";

function makeSettings(overrides: Partial<PracticeSettings> = {}): PracticeSettings {
  return {
    roundLength: 60,
    readingRange: "treble-starter",
    customReadingRange: { startNoteId: "C3", endNoteId: "B4" },
    adaptivePractice: true,
    autoPlayPitch: true,
    revealPitchAfterAnswer: true,
    ...overrides,
  };
}

function renderSettingsView(overrides: Partial<Parameters<typeof PracticeSettingsView>[0]> = {}) {
  const props = {
    mode: "reading" as const,
    rangeDetail: "Treble clef C4-G4",
    settings: makeSettings(),
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
      readingRangeControls: <div data-testid="reading-range-controls" />,
    });

    expect(screen.getByRole("heading", { name: "Reading range" })).toBeInTheDocument();
    expect(screen.getByTestId("reading-range-controls")).toBeInTheDocument();
    expect(screen.getByText("Treble clef C4-G4 note reading.")).toBeInTheDocument();
  });

  it("hides reading range controls in pitch mode and describes the pitch range", () => {
    renderSettingsView({
      mode: "pitch",
      readingRangeControls: <div data-testid="reading-range-controls" />,
    });

    expect(screen.queryByTestId("reading-range-controls")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reading range" })).not.toBeInTheDocument();
    expect(screen.getByText("Pitch recognition across one natural-note octave from C4 to B4.")).toBeInTheDocument();
  });
});
