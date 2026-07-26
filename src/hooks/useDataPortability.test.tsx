import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProgress } from "../noteData";
import { defaultSettings, serializePracticeDataExport } from "../storage";
import type { PracticeProgress, PracticeSettings } from "../types";
import { useDataPortability } from "./useDataPortability";

const PROGRESS_STORAGE_KEY = "notesense.progress.v2";
const SETTINGS_STORAGE_KEY = "notesense.settings.v3";

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

function renderPortabilityHook(
  options: Partial<{
    progress: PracticeProgress;
    settings: PracticeSettings;
    onImport: (nextProgress: PracticeProgress, nextSettings: PracticeSettings) => void;
    onStatusChange: (message: string, tone: "success" | "warning") => void;
  }> = {},
) {
  const onImport = options.onImport ?? vi.fn();
  const onStatusChange = options.onStatusChange ?? vi.fn();

  return {
    onImport,
    onStatusChange,
    ...renderHook(() =>
      useDataPortability({
        progress: options.progress ?? freshProgress(),
        settings: options.settings ?? defaultSettings,
        onImport,
        onStatusChange,
      }),
    ),
  };
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useDataPortability", () => {
  it("exports current practice data through a temporary download link", async () => {
    const createObjectURL = vi.fn(() => "blob:notesense-export");
    const revokeObjectURL = vi.fn();
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const progress = freshProgress();
    progress.reading.totalAttempts = 2;
    const { result } = renderPortabilityHook({ progress });

    try {
      await act(async () => result.current.handleExportData());

      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:notesense-export");
    } finally {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectUrl });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectUrl });
    }
  });

  it("imports valid practice data, persists it, and reports success", async () => {
    const importedProgress = freshProgress();
    importedProgress.reading.totalAttempts = 8;
    importedProgress.reading.totalCorrect = 6;
    const importedSettings = { ...defaultSettings, roundLength: 90 as const, readingRange: "bass-starter" as const };
    const file = new File(
      [serializePracticeDataExport(importedProgress, importedSettings, "2026-06-18T01:00:00.000Z")],
      "notesense-progress.json",
      { type: "application/json" },
    );
    const { result, onImport, onStatusChange } = renderPortabilityHook();

    await act(async () => result.current.handleImportData(file));

    expect(onImport).toHaveBeenCalledWith(importedProgress, importedSettings);
    expect(onStatusChange).toHaveBeenCalledWith("Progress imported.", "success");
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}")).toEqual(importedProgress);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(importedSettings);
  });

  it("loads valid imports even when storage cannot save them", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });
    const importedProgress = freshProgress();
    importedProgress.pitch.totalAttempts = 3;
    const file = new File(
      [serializePracticeDataExport(importedProgress, defaultSettings, "2026-06-18T01:00:00.000Z")],
      "notesense-progress.json",
      { type: "application/json" },
    );
    const { result, onImport, onStatusChange } = renderPortabilityHook();

    await act(async () => result.current.handleImportData(file));

    expect(onImport).toHaveBeenCalledWith(importedProgress, defaultSettings);
    expect(onStatusChange).toHaveBeenCalledWith("Imported data is loaded but not saved on this device.", "warning");
  });

  it("reports invalid imported data without replacing local progress", async () => {
    const { result, onImport, onStatusChange } = renderPortabilityHook();
    const file = new File(["{}"], "invalid.json", { type: "application/json" });

    await act(async () => result.current.handleImportData(file));

    expect(onImport).not.toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledWith("Choose a valid NoteSense export file.", "warning");
  });

  it("reports unreadable files", async () => {
    const { result, onImport, onStatusChange } = renderPortabilityHook();
    const unreadableFile = {
      text: vi.fn().mockRejectedValue(new Error("No file access")),
    } as unknown as File;

    await act(async () => result.current.handleImportData(unreadableFile));

    expect(onImport).not.toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledWith("Could not read this file.", "warning");
  });
});
