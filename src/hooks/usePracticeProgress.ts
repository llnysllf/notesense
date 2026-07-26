import { useCallback, useEffect, useState } from "react";
import { loadProgress, saveProgress } from "../storage";
import type { PracticeProgress } from "../types";

export function usePracticeProgress(): {
  progress: PracticeProgress;
  setProgress: (next: PracticeProgress) => void;
  persistProgress: (next: PracticeProgress) => boolean;
} {
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());

  useEffect(() => {
    void import("../evidenceLedger").then(({ initializeEvidenceLedger }) => initializeEvidenceLedger(progress));
    // The legacy backfill must run exactly once from the initially loaded
    // aggregate counters; later updates are represented by live ledger events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistProgress = useCallback((next: PracticeProgress) => saveProgress(next), []);

  return { progress, setProgress, persistProgress };
}
