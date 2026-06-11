import { useCallback, useState } from "react";
import { loadSettings, saveSettings } from "../storage";
import type { PracticeSettings } from "../types";

export function useSettings(): {
  settings: PracticeSettings;
  setSettings: (next: PracticeSettings) => void;
  persistSettings: (next: PracticeSettings) => boolean;
} {
  const [settings, setSettings] = useState<PracticeSettings>(() => loadSettings());

  const persistSettings = useCallback((next: PracticeSettings) => saveSettings(next), []);

  return { settings, setSettings, persistSettings };
}
