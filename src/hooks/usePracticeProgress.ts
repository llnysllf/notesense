import { useCallback, useState } from "react";
import { loadProgress, saveProgress } from "../storage";
import type { PracticeProgress } from "../types";

export function usePracticeProgress(): {
  progress: PracticeProgress;
  setProgress: (next: PracticeProgress) => void;
  persistProgress: (next: PracticeProgress) => boolean;
} {
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());

  const persistProgress = useCallback((next: PracticeProgress) => saveProgress(next), []);

  return { progress, setProgress, persistProgress };
}
