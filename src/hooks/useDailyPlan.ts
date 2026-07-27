// Owns today's plan: load it, regenerate it when the day rolls over, and record
// blocks as the learner finishes them.
//
// The plan is derived from the evidence snapshot, so it stays a consumer of the
// learning engine rather than keeping any mastery state of its own.

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadDailyPlan, saveDailyPlan } from "../storage";
import {
  buildMasterySnapshot,
  completeActiveBlock,
  isPlanStale,
  planDay,
  planProgress,
  startBlock,
  type DailyPlan,
  type PlanActivity,
  type PlanProgress,
} from "../types";
import type { AttemptEvent } from "../types";

export type UseDailyPlan = {
  plan: DailyPlan;
  progress: PlanProgress;
  // Called when the learner opens a block, so the matching activity can be
  // credited once it finishes.
  openBlock: (blockId: string) => void;
  // Called when an activity actually completes.
  completeActivity: (activity: PlanActivity) => void;
  regenerate: () => void;
};

function buildPlan(events: readonly AttemptEvent[], now: Date): DailyPlan {
  return planDay({ snapshot: buildMasterySnapshot(events, now), now });
}

const EMPTY_EVENTS: readonly AttemptEvent[] = [];

export function useDailyPlan(events: readonly AttemptEvent[] | null = EMPTY_EVENTS): UseDailyPlan {
  const [isWaitingForEvidence, setIsWaitingForEvidence] = useState(() => {
    const stored = loadDailyPlan();
    return events === null && !(stored && !isPlanStale(stored, { now: new Date() }));
  });
  const [plan, setPlan] = useState<DailyPlan>(() => {
    const stored = loadDailyPlan();
    const now = new Date();
    if (stored && !isPlanStale(stored, { now })) return stored;

    // Do not cache a new-learner plan while the evidence ledger is still
    // loading. Otherwise a returning learner can be stuck with an empty-ledger
    // plan for the rest of the day.
    const fresh = buildPlan(events ?? EMPTY_EVENTS, now);
    if (events !== null) saveDailyPlan(fresh);
    return fresh;
  });

  useEffect(() => {
    if (events === null || !isWaitingForEvidence) return;

    // Evidence arrives from IndexedDB after the first render. Schedule this as
    // the completion of that external load instead of synchronously cascading
    // a state update from the effect itself.
    const refresh = window.setTimeout(() => {
      const fresh = buildPlan(events, new Date());
      saveDailyPlan(fresh);
      setPlan(fresh);
      setIsWaitingForEvidence(false);
    }, 0);

    return () => window.clearTimeout(refresh);
  }, [events, isWaitingForEvidence]);

  // A plan left open overnight belongs to yesterday. Regenerate when the app
  // regains focus so a returning learner sees today's plan, not a stale one.
  useEffect(() => {
    const refreshIfStale = () => {
      setPlan((current) => {
        if (!isPlanStale(current, { now: new Date() })) return current;

        if (events === null) return current;
        const fresh = buildPlan(events, new Date());
        saveDailyPlan(fresh);
        return fresh;
      });
    };

    window.addEventListener("focus", refreshIfStale);
    return () => window.removeEventListener("focus", refreshIfStale);
  }, [events]);

  const openBlock = useCallback((blockId: string) => {
    setPlan((current) => {
      const next = startBlock(current, blockId);
      if (next !== current) saveDailyPlan(next);
      return next;
    });
  }, []);

  const completeActivity = useCallback((activity: PlanActivity) => {
    setPlan((current) => {
      const next = completeActiveBlock(current, activity);
      if (next !== current) saveDailyPlan(next);
      return next;
    });
  }, []);

  const regenerate = useCallback(() => {
    const fresh = buildPlan(events ?? EMPTY_EVENTS, new Date());
    saveDailyPlan(fresh);
    setPlan(fresh);
  }, [events]);

  const progress = useMemo(() => planProgress(plan), [plan]);

  return { plan, progress, openBlock, completeActivity, regenerate };
}
