import {
  createExportFileName,
  parsePracticeDataImport,
  saveProgress,
  saveSettings,
  serializePracticeDataExport,
} from "../storage";
import type { PracticeProgress, PracticeSettings } from "../types";

const IMPORT_SUCCESS = "Progress imported.";
const IMPORT_STORAGE_WARNING = "Imported data is loaded but not saved on this device.";
const IMPORT_READ_ERROR = "Could not read this file.";

interface UseDataPortabilityOptions {
  progress: PracticeProgress;
  settings: PracticeSettings;
  onImport: (nextProgress: PracticeProgress, nextSettings: PracticeSettings) => void;
  onStatusChange: (message: string, tone: "success" | "warning") => void;
}

export function useDataPortability({ progress, settings, onImport, onStatusChange }: UseDataPortabilityOptions): {
  handleExportData: () => void;
  handleImportData: (file: File) => Promise<void>;
} {
  function handleExportData() {
    const exportedAt = new Date();
    const data = serializePracticeDataExport(progress, settings, exportedAt.toISOString());
    const blob = new Blob([data], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = createExportFileName(exportedAt);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleImportData(file: File) {
    try {
      const importResult = parsePracticeDataImport(await file.text());
      if (!importResult.ok) {
        onStatusChange(importResult.error, "warning");
        return;
      }
      const { progress: nextProgress, settings: nextSettings } = importResult.data;
      const progressSaved = saveProgress(nextProgress);
      const settingsSaved = saveSettings(nextSettings);
      onImport(nextProgress, nextSettings);
      onStatusChange(
        progressSaved && settingsSaved ? IMPORT_SUCCESS : IMPORT_STORAGE_WARNING,
        progressSaved && settingsSaved ? "success" : "warning",
      );
    } catch {
      onStatusChange(IMPORT_READ_ERROR, "warning");
    }
  }

  return { handleExportData, handleImportData };
}
