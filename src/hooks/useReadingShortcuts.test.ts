import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../storage";
import { useReadingShortcuts } from "./useReadingShortcuts";

describe("useReadingShortcuts", () => {
  it("ignores unknown shortcuts and shortcuts outside reading mode", () => {
    const onAnswer = vi.fn();
    const { rerender } = renderHook(({ mode }) => useReadingShortcuts({ mode, settings: defaultSettings, onAnswer }), {
      initialProps: { mode: "reading" as "reading" | "pitch" },
    });

    fireEvent.keyDown(window, { key: "x" });
    expect(onAnswer).not.toHaveBeenCalled();

    rerender({ mode: "pitch" });
    fireEvent.keyDown(window, { key: "1" });
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
