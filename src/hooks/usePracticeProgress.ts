import { useCallback, useEffect, useRef, useState } from "react";
import { loadProgress, saveProgress } from "../storage";
import type { AttemptEvent, PracticeProgress } from "../types";

export function usePracticeProgress(): {
  progress: PracticeProgress;
  evidenceEvents: readonly AttemptEvent[] | null;
  setProgress: (next: PracticeProgress) => void;
  persistProgress: (next: PracticeProgress) => boolean;
} {
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());
  const initialProgress = useRef(progress);
  const [evidenceEvents, setEvidenceEvents] = useState<readonly AttemptEvent[] | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void import("../evidenceLedger")
      .then(({ initializeEvidenceLedger }) => initializeEvidenceLedger(initialProgress.current))
      .then((events) => {
        if (isCurrent) setEvidenceEvents(events);
      });
    // The legacy backfill must run exactly once from the initially loaded
    // aggregate counters; later updates are represented by live ledger events.
    return () => {
      isCurrent = false;
    };
  }, []);

  const persistProgress = useCallback((next: PracticeProgress) => saveProgress(next), []);

  return { progress, evidenceEvents, setProgress, persistProgress };
}
