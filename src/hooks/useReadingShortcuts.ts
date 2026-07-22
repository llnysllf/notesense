import { useEffect } from "react";
import { getReadingNotes } from "../noteData";
import type { PracticeMode, PracticeSettings } from "../types";

type UseReadingShortcutsOptions = {
  mode: PracticeMode;
  settings: PracticeSettings;
  onAnswer: (noteId: string) => void;
};

export function useReadingShortcuts({ mode, settings, onAnswer }: UseReadingShortcutsOptions) {
  // Run after every render so the window listener always uses the current session closure.
  useEffect(() => {
    const shortcutSource = getReadingNotes(settings.readingRange, settings.customReadingRange);

    function handleKeyDown(event: KeyboardEvent) {
      const shortcutOption = shortcutSource.find((note) => note.keyboardShortcut === event.key);
      if (mode === "reading" && shortcutOption !== undefined) onAnswer(shortcutOption.id);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
}
