import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../storage";
import { useSettings } from "./useSettings";

const SETTINGS_STORAGE_KEY = "notesense.settings.v3";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useSettings", () => {
  it("loads settings from normalized local storage", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        roundLength: 90,
        readingRange: "bass-starter",
        autoPlayPitch: false,
      }),
    );

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toMatchObject({
      roundLength: 90,
      readingRange: "bass-starter",
      autoPlayPitch: false,
    });
  });

  it("updates in-memory settings separately from persistence", () => {
    const { result } = renderHook(() => useSettings());
    const nextSettings = { ...defaultSettings, roundLength: 30 as const, adaptivePractice: false };

    act(() => result.current.setSettings(nextSettings));

    expect(result.current.settings).toEqual(nextSettings);
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it("persists settings and reports storage failures", () => {
    const { result } = renderHook(() => useSettings());
    const nextSettings = { ...defaultSettings, revealPitchAfterAnswer: false };

    expect(result.current.persistSettings(nextSettings)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(nextSettings);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    expect(result.current.persistSettings(nextSettings)).toBe(false);
  });
});
