import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../storage";
import type { PracticeSettings } from "../types";
import ReadingRangeSelector from "./ReadingRangeSelector";

function makeSettings(overrides: Partial<PracticeSettings> = {}): PracticeSettings {
  return {
    ...defaultSettings,
    ...overrides,
  };
}

function renderSelector(overrides: Partial<Parameters<typeof ReadingRangeSelector>[0]> = {}) {
  const props = {
    settings: makeSettings(),
    onCustomRangeChange: vi.fn(),
    onRangeChange: vi.fn(),
    ...overrides,
  };

  return { ...render(<ReadingRangeSelector {...props} />), props };
}

describe("ReadingRangeSelector", () => {
  it("renders the reading ranges with the active range pressed", () => {
    renderSelector();

    expect(screen.getByRole("button", { name: "Treble" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports range changes", () => {
    const { props } = renderSelector();

    fireEvent.click(screen.getByRole("button", { name: "Bass" }));
    expect(props.onRangeChange).toHaveBeenCalledWith("bass-starter");
  });

  it("hides the custom range card for preset ranges", () => {
    const { container } = renderSelector();

    expect(container.querySelector(".custom-range-card")).not.toBeInTheDocument();
  });

  it("shows the custom range card with note count and edge controls", () => {
    const { container } = renderSelector({ settings: makeSettings({ readingRange: "custom" }) });

    expect(container.querySelector(".custom-range-card")).toBeInTheDocument();
    expect(screen.getByText(/notes$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start C3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "End B4" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
  });

  it("updates the start edge from a piano key and advances to the end edge", () => {
    const { props } = renderSelector({ settings: makeSettings({ readingRange: "custom" }) });

    fireEvent.click(screen.getByRole("button", { name: /White piano key G3/ }));

    expect(props.onCustomRangeChange).toHaveBeenCalledWith({ startNoteId: "G3", endNoteId: "B4" });
    expect(screen.getByRole("button", { name: "End B4" })).toHaveAttribute("aria-pressed", "true");
  });

  it("updates the end edge after switching edges", () => {
    const { props } = renderSelector({ settings: makeSettings({ readingRange: "custom" }) });

    fireEvent.click(screen.getByRole("button", { name: "End B4" }));
    fireEvent.click(screen.getByRole("button", { name: /White piano key G4/ }));

    expect(props.onCustomRangeChange).toHaveBeenCalledWith({ startNoteId: "C3", endNoteId: "G4" });
  });

  it("normalizes an inverted selection", () => {
    const onCustomRangeChange = vi.fn();
    renderSelector({
      settings: makeSettings({ readingRange: "custom", customReadingRange: { startNoteId: "C4", endNoteId: "B4" } }),
      onCustomRangeChange,
    });

    // Choosing a start above the current end should still produce an ordered range.
    fireEvent.click(screen.getByRole("button", { name: /White piano key C5/ }));

    const nextRange = onCustomRangeChange.mock.calls[0]?.[0] as { startNoteId: string; endNoteId: string };
    expect(nextRange.startNoteId).toBe("B4");
    expect(nextRange.endNoteId).toBe("C5");
  });

  it("ignores keys outside the custom range window", () => {
    const { props } = renderSelector({ settings: makeSettings({ readingRange: "custom" }) });

    fireEvent.click(screen.getByRole("button", { name: /White piano key A0/ }));
    expect(props.onCustomRangeChange).not.toHaveBeenCalled();
  });
});
