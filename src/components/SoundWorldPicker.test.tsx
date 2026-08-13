import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_SOUND_WORLDS, DEFAULT_SOUND_WORLD_ID, type SoundWorldView } from "../types";
import SoundWorldPicker from "./SoundWorldPicker";

function renderPicker(overrides: Partial<SoundWorldView> = {}) {
  const sound: SoundWorldView = {
    worlds: BUILT_IN_SOUND_WORLDS,
    activeId: DEFAULT_SOUND_WORLD_ID,
    notice: null,
    select: vi.fn(),
    preview: vi.fn(),
    ...overrides,
  };

  return { ...render(<SoundWorldPicker sound={sound} />), sound };
}

describe("SoundWorldPicker", () => {
  it("marks the world currently in use", () => {
    renderPicker({ activeId: "warm" });

    const warm = screen.getByRole("button", { name: /^Warm/ });
    expect(warm.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^Plain/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("chooses a world without playing it", () => {
    const { sound } = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /^Bright/ }));

    expect(sound.select).toHaveBeenCalledWith("bright");
    expect(sound.preview).not.toHaveBeenCalled();
  });

  it("previews a world without choosing it", () => {
    // Comparing two voices should not mean changing settings twice.
    const { sound } = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Preview Reed" }));

    expect(sound.preview).toHaveBeenCalledWith("reed");
    expect(sound.select).not.toHaveBeenCalled();
  });

  it("shows the licence and size of every world, not only paid ones", () => {
    renderPicker();

    const credits = screen.getAllByText(/No download/);
    expect(credits).toHaveLength(BUILT_IN_SOUND_WORLDS.length);
    expect(credits[0]?.textContent).toContain("public-domain");
  });

  it("says so when something other than the chosen world is being heard", () => {
    renderPicker({ notice: "That sound is not available on this device." });

    expect(screen.getByRole("status").textContent).toMatch(/not available/);
  });

  it("stays quiet when the chosen world is the one playing", () => {
    renderPicker();

    expect(screen.queryByRole("status")).toBeNull();
  });
});
