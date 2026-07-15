import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../storage";
import PitchTrainingControls from "./PitchTrainingControls";

function renderControls(settings = defaultSettings) {
  const onSettingsChange = vi.fn();
  render(<PitchTrainingControls settings={settings} onSettingsChange={onSettingsChange} />);
  return onSettingsChange;
}

describe("PitchTrainingControls", () => {
  it("switches exercises, melody length, and preset ranges", () => {
    const onSettingsChange = renderControls({ ...defaultSettings, pitchExercise: "melody" });

    expect(screen.getByRole("button", { name: "Melody" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Chromatic 12" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Single note" }));
    fireEvent.click(screen.getByRole("button", { name: "5 notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Full 88" }));

    expect(onSettingsChange).toHaveBeenNthCalledWith(1, { pitchExercise: "single" });
    expect(onSettingsChange).toHaveBeenNthCalledWith(2, { melodyLength: 5 });
    expect(onSettingsChange).toHaveBeenNthCalledWith(3, { pitchRange: "full" });
  });

  it("hides melody length controls for single-note training", () => {
    const onSettingsChange = renderControls();

    expect(screen.queryByRole("group", { name: "Melody length" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "5 notes" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Melody" }));
    expect(onSettingsChange).toHaveBeenCalledWith({ pitchExercise: "melody" });
  });

  it("sets custom pitch endpoints from white and black piano keys", () => {
    const onSettingsChange = renderControls({
      ...defaultSettings,
      pitchRange: "custom",
      customPitchRange: { startNoteId: "C4", endNoteId: "G4" },
    });
    const customCard = screen.getByLabelText("Custom pitch range endpoint").closest(".custom-range-card");
    if (customCard === null) throw new Error("Missing custom pitch range card.");
    const card = within(customCard as HTMLElement);

    expect(card.getByText("8 keys")).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: /^Black piano key C#4/ }));
    fireEvent.click(card.getByRole("button", { name: /^White piano key F4/ }));

    expect(onSettingsChange).toHaveBeenNthCalledWith(1, {
      customPitchRange: { startNoteId: "C#4", endNoteId: "G4" },
      pitchRange: "custom",
    });
    expect(onSettingsChange).toHaveBeenNthCalledWith(2, {
      customPitchRange: { startNoteId: "C4", endNoteId: "F4" },
      pitchRange: "custom",
    });

    fireEvent.click(card.getByRole("button", { name: "Start C4" }));
    fireEvent.click(card.getByRole("button", { name: "End G4" }));
  });
});
