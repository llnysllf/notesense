import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadingControls from "./ReadingControls";
import { defaultSettings } from "@notesense/shared";
import type { PracticeSettings, ReadingMode } from "../types";

function renderControls(readingMode: ReadingMode = "practice") {
  const settings: PracticeSettings = { ...defaultSettings, readingMode };
  const onModeChange = vi.fn();
  const onRangeChange = vi.fn();
  const onCustomRangeChange = vi.fn();
  render(
    <ReadingControls
      settings={settings}
      onModeChange={onModeChange}
      onRangeChange={onRangeChange}
      onCustomRangeChange={onCustomRangeChange}
    />,
  );
  return { onModeChange };
}

describe("ReadingControls", () => {
  it("offers all four ways to work and marks the active one", () => {
    renderControls("learn");

    const group = screen.getByRole("group", { name: "Reading mode" });
    expect(group).toBeInTheDocument();
    for (const label of ["Learn", "Practice", "Test", "Custom"]) {
      expect(screen.getByRole("button", { name: `${label} mode` })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Learn mode" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Practice mode" })).toHaveAttribute("aria-pressed", "false");
  });

  it("explains what the selected mode does", () => {
    renderControls("test");
    expect(screen.getByText(/no hints/i)).toBeInTheDocument();

    renderControls("practice");
    expect(screen.getByText(/adaptive/i)).toBeInTheDocument();
  });

  it("reports a mode change", () => {
    const { onModeChange } = renderControls("practice");

    fireEvent.click(screen.getByRole("button", { name: "Test mode" }));

    expect(onModeChange).toHaveBeenCalledWith("test");
  });

  it("hides the range picker in Test so two attempts stay comparable", () => {
    renderControls("test");

    expect(screen.getByRole("note")).toHaveTextContent(/compare attempts/i);
    expect(screen.queryByRole("group", { name: /reading range/i })).not.toBeInTheDocument();
  });

  it("offers the range picker in the modes that allow it", () => {
    renderControls("practice");

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grand" })).toBeInTheDocument();
  });
});
